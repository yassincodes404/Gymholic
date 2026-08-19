package com.gymholic.payment;

import com.gymholic.common.response.ApiResponse;
import com.gymholic.payment.dto.PaymentProvidersStatusDto;
import com.gymholic.payment.dto.SavePaymobConfigRequest;
import com.gymholic.payment.provider.PaymobProvider;
import com.gymholic.payment.provider.PaymentProviderConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Payment gateway management for Admin → Integrations: connect Paymob
 * (credentials + enable toggle + connection test). Stripe will join this
 * page when its integration is built.
 */
@RestController
@RequestMapping("/api/payments/admin/providers")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class PaymentProviderAdminController {

    private final PaymentProviderConfigService configService;
    private final PaymobProvider paymobProvider;

    @GetMapping
    public ResponseEntity<ApiResponse<PaymentProvidersStatusDto>> status() {
        return ResponseEntity.ok(ApiResponse.success(buildStatus()));
    }

    @PutMapping("/paymob")
    public ResponseEntity<ApiResponse<PaymentProvidersStatusDto>> savePaymob(
            @RequestBody SavePaymobConfigRequest request) {
        configService.savePaymobConfig(
            request.getApiKey(),
            request.getIntegrationId(),
            request.getIframeId(),
            request.getHmacSecret(),
            request.getPublicKey(),
            request.getEnabled());
        return ResponseEntity.ok(ApiResponse.success("Paymob settings saved", buildStatus()));
    }

    /** Verifies the saved API key against Paymob's auth endpoint. */
    @PostMapping("/paymob/test")
    public ResponseEntity<ApiResponse<Map<String, Object>>> testPaymob() {
        try {
            paymobProvider.testConnection();
            return ResponseEntity.ok(ApiResponse.success(
                "Connection successful", Map.of("ok", true)));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.success(
                "Connection failed: " + e.getMessage(), Map.of("ok", false)));
        }
    }

    private PaymentProvidersStatusDto buildStatus() {
        PaymentProviderConfigService.PaymobCredentials credentials = configService.getPaymobCredentials();
        boolean configured = credentials.complete();
        boolean enabled = configService.isPaymobEnabled();
        return PaymentProvidersStatusDto.builder()
            .activeProvider(configService.getActiveProvider())
            .mockAvailable(configService.isMockAvailable())
            .paymob(PaymentProvidersStatusDto.PaymobStatus.builder()
                .enabled(enabled)
                .configured(configured)
                .active(enabled && configured)
                .apiKeyMasked(mask(credentials.apiKey()))
                .integrationId(credentials.integrationId())
                .iframeId(credentials.iframeId())
                .hmacSecretMasked(mask(credentials.hmacSecret()))
                .publicKeyMasked(credentials.publicKey() == null || credentials.publicKey().isBlank()
                    ? "" : mask(credentials.publicKey()))
                .build())
            .stripe(Map.of("available", false, "comingSoon", true))
            .build();
    }

    private static String mask(String secret) {
        if (secret == null || secret.isBlank()) return "";
        if (secret.length() <= 4) return "••••";
        return "••••" + secret.substring(secret.length() - 4);
    }
}
