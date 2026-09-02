package com.gymholic.payment.provider;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymholic.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymobProvider implements PaymentProvider {

    /**
     * Credentials come from Admin → Integrations (settings table) with the
     * PAYMOB_* environment variables as fallback — resolved per call so a
     * config saved from the admin UI takes effect immediately.
     */
    private final PaymentProviderConfigService configService;
    private final com.gymholic.payment.FxRateService fxRateService;

    private final RestTemplate restTemplate;

    private final ObjectMapper objectMapper;

    private static final String PAYMOB_BASE = "https://accept.paymob.com";
    private static final String INTENTION_URL = PAYMOB_BASE + "/v1/intention/";

    /** Frontend origin — base for the webhook + the post-payment redirect. */
    @Value("${app.cors.allowed-origins:https://gymholic.ae}")
    private String frontendOrigin;

    @Value("${app.payments.paymob-notification-path:/api/payments/webhook/paymob}")
    private String notificationPath;

    @Value("${app.payments.paymob-redirect-path:/payment-status}")
    private String redirectPath;

    @Override
    public String getProviderName() {
        return "paymob";
    }

    /** Verifies the saved secret key with an auth-only intentions list call. */
    public void testConnection() {
        requireCredentials();
        try {
            HttpHeaders headers = authHeaders(configService.getPaymobCredentials().apiKey());
            restTemplate.exchange(INTENTION_URL, org.springframework.http.HttpMethod.GET,
                new HttpEntity<>(null, headers), String.class);
            log.info("Paymob connection test succeeded");
        } catch (Exception e) {
            throw new RuntimeException("Paymob rejected the secret key: " + rootMessage(e));
        }
    }

    /**
     * Checkout for the current Paymob accounts (egy_* keys): create a
     * Payment Intention with the secret key, then hand the browser to
     * Paymob's Unified Checkout with the client secret + public key. The
     * transaction-processed webhook lands on our HMAC-verified endpoint and
     * confirms the booking.
     */
    @Override
    public Map<String, String> createCheckout(BigDecimal amount, String currency,
                                               String description, Map<String, String> metadata) {
        PaymentProviderConfigService.PaymobCredentials credentials = requireCredentials();
        if (credentials.publicKey() == null || credentials.publicKey().isBlank()) {
            throw new BadRequestException(
                "Paymob public key is missing — add PAYMOB_PUBLIC_KEY (egy_pk_…) in Admin → Integrations.");
        }
        try {
            // Accounts without USD collection (e.g. Egyptian Paymob) collect
            // their local currency instead — and the amount is CONVERTED at
            // the admin-managed EGP/USD rate, never just relabeled, so a $49
            // order charges the correct EGP value.
            String effectiveCurrency = configService.getPaymobCurrencyOverride();
            if (effectiveCurrency == null || effectiveCurrency.isBlank()) {
                effectiveCurrency = currency;
            }
            BigDecimal payableAmount = amount;
            if (!effectiveCurrency.equalsIgnoreCase(currency)) {
                payableAmount = amount.multiply(configService.getEgpUsdRate())
                    .setScale(2, java.math.RoundingMode.HALF_UP);
            }
            long amountCents = payableAmount.movePointRight(2).longValueExact();
            log.info("Paymob intention: {} {} (order currency {}) for integration {} — FX {} EGP/USD ({})",
                payableAmount.toPlainString(), effectiveCurrency, currency, credentials.integrationId(),
                configService.getEgpUsdRate(), fxRateService.getRateSource());

            Map<String, Object> body = new HashMap<>();
            body.put("amount", amountCents);
            body.put("currency", effectiveCurrency);
            body.put("payment_methods", List.of(Long.parseLong(credentials.integrationId().trim())));
            body.put("special_reference", "gymholic-" + System.currentTimeMillis());
            body.put("notification_url", frontendOrigin() + notificationPath);
            body.put("redirection_url", frontendOrigin() + redirectPath);

            Map<String, Object> item = new HashMap<>();
            item.put("name", description);
            item.put("amount", amountCents);
            item.put("description", description);
            item.put("quantity", 1);
            body.put("items", List.of(item));

            // Paying user's details travel in the metadata map; Paymob needs
            // them for the invoice/billing record.
            String email = metadata.getOrDefault("clientEmail", "customer@gymholic.com");
            String firstName = metadata.getOrDefault("clientFirstName", "Gymholic");
            String lastName = metadata.getOrDefault("clientLastName", "Customer");
            String phone = metadata.getOrDefault("clientPhone", "+201000000000");

            Map<String, Object> customer = new HashMap<>();
            customer.put("first_name", firstName);
            customer.put("last_name", lastName);
            customer.put("email", email);
            customer.put("phone_number", phone);
            body.put("customer", customer);

            Map<String, Object> billing = new HashMap<>(customer);
            billing.put("apartment", "NA");
            billing.put("floor", "NA");
            billing.put("street", "NA");
            billing.put("building", "NA");
            billing.put("postal_code", "NA");
            billing.put("city", "Cairo");
            billing.put("country", "EG");
            billing.put("state", "NA");
            body.put("billing_data", billing);

            ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                INTENTION_URL, new HttpEntity<>(body, authHeaders(credentials.apiKey())), JsonNode.class);
            JsonNode root = response.getBody();
            if (root == null || !root.has("client_secret")) {
                throw new RuntimeException("Paymob intention response missing client_secret");
            }

            String clientSecret = root.get("client_secret").asText();
            String orderId = root.path("intention_order_id").asText(
                root.path("order").path("id").asText(""));

            String checkoutUrl = PAYMOB_BASE + "/unifiedcheckout/?publicKey="
                + credentials.publicKey() + "&clientSecret=" + clientSecret;

            Map<String, String> result = new HashMap<>();
            result.put("checkoutUrl", checkoutUrl);
            result.put("transactionId", orderId);
            result.put("payableAmount", payableAmount.toPlainString());
            result.put("payableCurrency", effectiveCurrency.toUpperCase());
            return result;
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Paymob checkout creation failed", e);
            throw new BadRequestException("Failed to initiate payment with Paymob: " + rootMessage(e));
        }
    }

    /** Paymob's current accounts authenticate with "Token <secret key>". */
    private HttpHeaders authHeaders(String secretKey) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Token " + secretKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private String frontendOrigin() {
        return frontendOrigin.split(",")[0].trim();
    }

    private static String rootMessage(Exception e) {
        Throwable t = e;
        while (t.getCause() != null && t.getCause() != t) {
            t = t.getCause();
        }
        return t.getMessage() != null ? t.getMessage() : e.getClass().getSimpleName();
    }

    private PaymentProviderConfigService.PaymobCredentials requireCredentials() {
        PaymentProviderConfigService.PaymobCredentials credentials = configService.getPaymobCredentials();
        if (!credentials.complete()) {
            throw new BadRequestException(
                "Paymob is not configured yet — add your secret key, integration ID, public key and HMAC secret in Admin → Integrations.");
        }
        return credentials;
    }

    @Override
    public Map<String, Object> verifyWebhook(String payload, String signature) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            JsonNode obj = root.path("obj");

            if (obj.isMissingNode()) {
                throw new BadRequestException("Invalid webhook payload structure");
            }

            // Calculate HMAC
            String calculatedHmac = calculateHmac(obj);

            if (!calculatedHmac.equalsIgnoreCase(signature)) {
                log.warn("HMAC verification failed. Expected: {}, Got: {}", calculatedHmac, signature);
                throw new BadRequestException("Invalid HMAC signature");
            }

            Map<String, Object> result = new HashMap<>();
            result.put("success", obj.path("success").asBoolean());
            result.put("orderId", obj.path("order").path("id").asText());
            result.put("transactionId", obj.path("id").asText());
            result.put("amountCents", obj.path("amount_cents").asInt());
            result.put("currency", obj.path("currency").asText());
            result.put("pending", obj.path("pending").asBoolean());

            return result;
        } catch (JsonProcessingException e) {
            throw new BadRequestException("Failed to parse webhook payload");
        }
    }

    private String calculateHmac(JsonNode obj) {
        // Paymob specific order of fields for HMAC
        String[] fields = {
            "amount_cents",
            "created_at",
            "currency",
            "error_occured",
            "has_parent_transaction",
            "id",
            "integration_id",
            "is_3d_secure",
            "is_auth",
            "is_capture",
            "is_refunded",
            "is_standalone_payment",
            "is_voided",
            "order.id",
            "owner",
            "pending",
            "source_data.pan",
            "source_data.sub_type",
            "source_data.type",
            "success"
        };

        StringBuilder sb = new StringBuilder();
        for (String field : fields) {
            String value = getJsonNodeValue(obj, field);
            sb.append(value);
        }

        return hmacSha512(sb.toString(), configService.getPaymobCredentials().hmacSecret());
    }

    private String getJsonNodeValue(JsonNode obj, String path) {
        String[] parts = path.split("\\.");
        JsonNode current = obj;
        for (String part : parts) {
            current = current.path(part);
            if (current.isMissingNode() || current.isNull()) {
                return "";
            }
        }

        if (current.isBoolean()) {
            return String.valueOf(current.asBoolean());
        }
        return current.asText();
    }

    private String hmacSha512(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            mac.init(secretKeySpec);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hmacBytes);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("Failed to calculate HMAC", e);
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }

    @Override
    public Map<String, String> refund(String transactionId, BigDecimal amount) {
        // TODO: Implement Paymob refund
        throw new UnsupportedOperationException("Paymob refund not yet implemented");
    }
}
