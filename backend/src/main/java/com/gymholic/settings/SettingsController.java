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

    @GetMapping
    public ApiResponse<Map<String, String>> getAllSettings() {
        return ApiResponse.success(settingsService.getAllSettings());
    }

    /**
     * Public booking prices (USD) and feature flags that drive what the
     * website charges and shows. Managed from the admin settings page.
     */
    @GetMapping("/pricing")
    @PreAuthorize("permitAll()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPricing() {
        Map<String, String> all = settingsService.getAllSettings();
        Map<String, Object> pricing = new HashMap<>();
        pricing.put("currency", all.getOrDefault("BOOKING_CURRENCY", "USD"));
        pricing.put("strategyCall", parse(all.get("BOOKING_PRICE_STRATEGY_CALL"), 125));
        pricing.put("inPerson", parse(all.get("BOOKING_PRICE_IN_PERSON"), 275));
        pricing.put("discovery", 0);
        pricing.put("freeConsultationEnabled", settingsService.getBool("BOOKING_FREE_CONSULTATION_ENABLED", true));
        pricing.put("academyMembershipPrice", parse(all.get("ACADEMY_MEMBERSHIP_PRICE"), 29));
        pricing.put("academyPrePurchaseEnabled", settingsService.getBool("ACADEMY_PRE_PURCHASE_ENABLED", true));
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
