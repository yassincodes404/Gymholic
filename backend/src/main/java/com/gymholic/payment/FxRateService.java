package com.gymholic.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.gymholic.settings.SettingsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;

/*!
 * USD → EGP exchange rate, in priority order:
 *
 *   1. The admin-managed PAYMOB_EGP_USD_RATE setting — a deliberate,
 *      pinned override (e.g. to match the merchant's bank rate).
 *   2. The live daily market rate (exchangerate-api's free endpoint —
 *      no key), cached for 12h and refreshed nightly.
 *   3. A conservative fallback of 48.0 (only if both are unavailable).
 *
 * This is money: the charged EGP amount must track the real market, never
 * a stale hardcoded number. The chosen rate and its source are logged on
 * every Paymob intention so every charge is auditable.
 */
@Slf4j
@Service
public class FxRateService {

    private final SettingsService settingsService;
    private final RestTemplate restTemplate;

    public FxRateService(SettingsService settingsService) {
        this.settingsService = settingsService;
        // Own client with hard timeouts — this call sits inside checkout and
        // the public pricing endpoint, and the shared RestTemplate bean has
        // none configured. A hung FX provider must never hang a payment.
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout(3_000);
        this.restTemplate = new RestTemplate(factory);
    }

    @Value("${app.payments.fxrates-url:https://open.er-api.com/v6/latest/USD}")
    private String liveUrl;

    @Value("${app.payments.egp-usd-fallback:48.0}")
    private String fallbackRate;

    private static final long CACHE_TTL_MS = 12L * 60 * 60 * 1000;

    private volatile BigDecimal cachedLiveRate;
    private volatile long cachedAt = 0;

    /** The rate used for USD→EGP conversion (2 decimals). */
    public BigDecimal getEgpUsdRate() {
        BigDecimal pinned = readAdminOverride();
        if (pinned != null) {
            return pinned;
        }
        BigDecimal live = liveRate();
        if (live != null) {
            return live;
        }
        return parse(fallbackRate, "48.0");
    }

    /** Where the current rate came from — for logs and the admin UI. */
    public String getRateSource() {
        if (readAdminOverride() != null) return "admin-setting";
        if (liveRate() != null) return "live-market";
        return "fallback";
    }

    /** Refreshes the cache shortly after the provider publishes each day. */
    @Scheduled(fixedDelay = 60L * 60 * 1000, initialDelay = 60L * 1000)
    public void refreshLiveRate() {
        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                liveUrl, HttpMethod.GET, new HttpEntity<>(null), JsonNode.class);
            JsonNode root = response.getBody();
            JsonNode egp = root == null ? null : root.path("rates").path("EGP");
            if (egp.isNumber()) {
                BigDecimal rate = egp.decimalValue();
                if (rate.compareTo(BigDecimal.ZERO) > 0) {
                    cachedLiveRate = rate;
                    cachedAt = System.currentTimeMillis();
                    log.info("Live USD→EGP rate refreshed: {} (source: {})", rate, liveUrl);
                }
            }
        } catch (Exception e) {
            // Network/API failure is survivable — the cached or fallback rate
            // serves until the next attempt. Never fail a payment over FX.
            log.warn("Could not refresh the live USD→EGP rate: {}", e.getMessage());
        }
    }

    private BigDecimal liveRate() {
        if (cachedLiveRate == null || System.currentTimeMillis() - cachedAt > CACHE_TTL_MS) {
            refreshLiveRate();
        }
        BigDecimal rate = cachedLiveRate;
        // A stale cache (>48h old) shouldn't outrank the fallback silently.
        if (rate != null && System.currentTimeMillis() - cachedAt > 48L * 60 * 60 * 1000) {
            return null;
        }
        return rate == null ? null : rate.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal readAdminOverride() {
        try {
            String stored = settingsService.getAllSettings().get("PAYMOB_EGP_USD_RATE");
            if (stored != null && !stored.isBlank()) {
                return parse(stored, null);
            }
        } catch (Exception e) {
            log.warn("Could not read the EGP rate setting: {}", e.getMessage());
        }
        return null;
    }

    private static BigDecimal parse(String raw, String fallbackRaw) {
        try {
            BigDecimal rate = new BigDecimal(raw.trim());
            if (rate.compareTo(BigDecimal.ZERO) > 0) {
                return rate.setScale(2, RoundingMode.HALF_UP);
            }
        } catch (Exception ignore) {
            // fall through
        }
        return fallbackRaw == null ? null : new BigDecimal(fallbackRaw).setScale(2, RoundingMode.HALF_UP);
    }
}
