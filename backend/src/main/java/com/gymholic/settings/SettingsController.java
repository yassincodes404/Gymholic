package com.gymholic.settings;

import com.gymholic.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class SettingsController {

    private final SettingsService settingsService;
    private final com.gymholic.payment.provider.PaymentProviderConfigService paymobConfig;
    private final com.gymholic.payment.FxRateService fxRates;

    @GetMapping
    public ApiResponse<Map<String, String>> getAllSettings() {
        return ApiResponse.success(settingsService.getAllSettings());
    }

    /**
     * Public booking prices (USD) that drive what the website charges and
     * shows. Managed from the admin settings page. All services are paid —
     * including the 3-hour free time session.
     */
    @GetMapping("/pricing")
    @PreAuthorize("permitAll()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPricing() {
        Map<String, String> all = settingsService.getAllSettings();
        Map<String, Object> pricing = new HashMap<>();
        pricing.put("currency", all.getOrDefault("BOOKING_CURRENCY", "USD"));
        pricing.put("strategyCall", parse(all.get("BOOKING_PRICE_STRATEGY_CALL"), 125));
        pricing.put("inPerson", parse(all.get("BOOKING_PRICE_IN_PERSON"), 275));
        pricing.put("openSession", parse(all.get("BOOKING_PRICE_OPEN_SESSION"), 150));
        pricing.put("freeSessionPrice", parse(all.get("BOOKING_PRICE_FREE_SESSION"), 300));
        pricing.put("academyMembershipPrice", parse(all.get("ACADEMY_MEMBERSHIP_PRICE"), 29));
        pricing.put("academyPrePurchaseEnabled", settingsService.getBool("ACADEMY_PRE_PURCHASE_ENABLED", true));
        pricing.put("academyMembershipCancellable", settingsService.getBool("ACADEMY_MEMBERSHIP_CANCELLABLE", true));
        // What the gateway actually collects (Egypt configuration): the
        // local Paymob currency (e.g. "EGP", blank = USD) and the EGP/USD
        // rate used to convert USD totals — so checkout pages can show the
        // real payable amount before the payment starts. Not secret.
        String paymobCurrency = paymobConfig.getPaymobCurrencyOverride();
        pricing.put("paymobCurrency", paymobCurrency);
        pricing.put("egpUsdRate", paymobConfig.getEgpUsdRate().toPlainString());
        pricing.put("egpRateSource", fxRates.getRateSource());
        return ResponseEntity.ok(ApiResponse.success(pricing));
    }

    private double parse(String value, double fallback) {
        try {
            return value == null ? fallback : Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    @PutMapping
    public ApiResponse<Map<String, String>> updateSettings(@RequestBody Map<String, String> settings) {
        settings.forEach(settingsService::updateSetting);
        return ApiResponse.success("Settings updated", settingsService.getAllSettings());
    }
}
