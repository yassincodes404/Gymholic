package com.gymholic.payment.provider;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymholic.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final String PAYMOB_API_BASE = "https://accept.paymob.com/api";

    @Override
    public String getProviderName() {
        return "paymob";
    }

    /** Verifies the configured API key by requesting an auth token from Paymob. */
    public void testConnection() {
        PaymentProviderConfigService.PaymobCredentials credentials = requireCredentials();
        String url = PAYMOB_API_BASE + "/auth/tokens";
        ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, Map.of("api_key", credentials.apiKey()), JsonNode.class);
        if (response.getBody() == null || !response.getBody().has("token")) {
            throw new RuntimeException("Paymob rejected the API key");
        }
    }

    @Override
    public Map<String, String> createCheckout(BigDecimal amount, String currency,
                                               String description, Map<String, String> metadata) {
        PaymentProviderConfigService.PaymobCredentials credentials = requireCredentials();
        try {
            // 1. Authentication Request
            String token = getAuthToken(credentials);

            // 2. Order Registration API
            String orderId = registerOrder(token, amount, currency, metadata);

            // 3. Payment Key Request
            String paymentToken = requestPaymentKey(token, amount, currency, orderId, credentials);

            // 4. Construct iframe URL
            String checkoutUrl = "https://accept.paymob.com/api/acceptance/iframes/"
                + credentials.iframeId() + "?payment_token=" + paymentToken;

            Map<String, String> result = new HashMap<>();
            result.put("checkoutUrl", checkoutUrl);
            result.put("transactionId", orderId); // Use orderId as transaction tracking ID initially
            return result;
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Paymob checkout creation failed", e);
            throw new BadRequestException("Failed to initiate payment with Paymob");
        }
    }

    private PaymentProviderConfigService.PaymobCredentials requireCredentials() {
        PaymentProviderConfigService.PaymobCredentials credentials = configService.getPaymobCredentials();
        if (!credentials.complete()) {
            throw new BadRequestException(
                "Paymob is not configured yet — add your API key, integration ID, iframe ID and HMAC secret in Admin → Integrations.");
        }
        return credentials;
    }

    private String getAuthToken(PaymentProviderConfigService.PaymobCredentials credentials) {
        String url = PAYMOB_API_BASE + "/auth/tokens";
        Map<String, String> body = Map.of("api_key", credentials.apiKey());
        ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, body, JsonNode.class);
        if (response.getBody() == null || !response.getBody().has("token")) {
            throw new RuntimeException("Invalid response from Paymob Auth");
        }
        return response.getBody().get("token").asText();
    }

    private String registerOrder(String token, BigDecimal amount, String currency, Map<String, String> metadata) {
        String url = PAYMOB_API_BASE + "/ecommerce/orders";
        
        // Amount should be in cents
        int amountCents = amount.multiply(BigDecimal.valueOf(100)).intValue();
        
        Map<String, Object> body = new HashMap<>();
        body.put("auth_token", token);
        body.put("delivery_needed", "false");
        body.put("amount_cents", String.valueOf(amountCents));
        body.put("currency", currency);
        
        // Convert metadata keys if necessary, or just pass them as items/shipping data
        // For simplicity, we just pass basic order info
        
        ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, body, JsonNode.class);
        if (response.getBody() == null || !response.getBody().has("id")) {
            throw new RuntimeException("Invalid response from Paymob Order Registration");
        }
        return response.getBody().get("id").asText();
    }

    private String requestPaymentKey(String token, BigDecimal amount, String currency, String orderId,
                                     PaymentProviderConfigService.PaymobCredentials credentials) {
        String url = PAYMOB_API_BASE + "/acceptance/payment_keys";

        int amountCents = amount.multiply(BigDecimal.valueOf(100)).intValue();

        Map<String, Object> body = new HashMap<>();
        body.put("auth_token", token);
        body.put("amount_cents", String.valueOf(amountCents));
        body.put("expiration", 3600);
        body.put("order_id", orderId);
        body.put("currency", currency);
        body.put("integration_id", credentials.integrationId());
        
        // Billing data is required by Paymob
        Map<String, String> billingData = new HashMap<>();
        billingData.put("apartment", "NA");
        billingData.put("email", "customer@gymholic.com"); // We should ideally get this from the user
        billingData.put("floor", "NA");
        billingData.put("first_name", "Gymholic");
        billingData.put("street", "NA");
        billingData.put("building", "NA");
        billingData.put("phone_number", "+971500000000");
        billingData.put("shipping_method", "NA");
        billingData.put("postal_code", "NA");
        billingData.put("city", "Dubai");
        billingData.put("country", "AE");
        billingData.put("last_name", "Customer");
        billingData.put("state", "NA");
        
        body.put("billing_data", billingData);
        
        ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, body, JsonNode.class);
        if (response.getBody() == null || !response.getBody().has("token")) {
            throw new RuntimeException("Invalid response from Paymob Payment Key Request");
        }
        return response.getBody().get("token").asText();
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

