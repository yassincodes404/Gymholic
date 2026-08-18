package com.gymholic.calendar;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

/**
 * Real Zoom meetings via Server-to-Server OAuth — active only when
 * ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET are configured.
 * Without credentials the booking flow falls back to the Google Calendar /
 * Meet link, so nothing here can block a confirmation.
 */
@Slf4j
@Service
public class ZoomService {

    private static final String TOKEN_URL = "https://zoom.us/oauth/token";
    private static final String MEETINGS_URL = "https://api.zoom.us/v2/users/me/meetings";
    private static final DateTimeFormatter ZOOM_UTC =
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'").withZone(ZoneOffset.UTC);

    @Value("${app.zoom.account-id:}")
    private String accountId;

    @Value("${app.zoom.client-id:}")
    private String clientId;

    @Value("${app.zoom.client-secret:}")
    private String clientSecret;

    public boolean isEnabled() {
        return accountId != null && !accountId.isBlank()
            && clientId != null && !clientId.isBlank()
            && clientSecret != null && !clientSecret.isBlank();
    }

    /** Creates a meeting and returns the join URL; empty when disabled or on failure. */
    @SuppressWarnings("unchecked")
    public Optional<String> createMeeting(String topic, Instant start, int durationMinutes) {
        if (!isEnabled()) {
            return Optional.empty();
        }
        try {
            RestClient client = RestClient.create();

            String credentials = Base64.getEncoder()
                .encodeToString((clientId + ":" + clientSecret).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            Map<String, Object> tokenResponse = client.post()
                .uri(TOKEN_URL + "?grant_type=account_credentials&account_id=" + accountId)
                .header("Authorization", "Basic " + credentials)
                .retrieve()
                .body(Map.class);
            String accessToken = (String) tokenResponse.get("access_token");
            if (accessToken == null) {
                throw new IllegalStateException("Zoom token response missing access_token");
            }

            Map<String, Object> meeting = client.post()
                .uri(MEETINGS_URL)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                    "topic", topic,
                    "type", 2, // scheduled meeting
                    "start_time", ZOOM_UTC.format(start),
                    "duration", durationMinutes,
                    "timezone", "UTC",
                    "settings", Map.of("join_before_host", true, "waiting_room", false)))
                .retrieve()
                .body(Map.class);

            String joinUrl = (String) meeting.get("join_url");
            log.info("Zoom meeting created for '{}' at {}: {}", topic, start, joinUrl);
            return Optional.ofNullable(joinUrl);
        } catch (Exception e) {
            log.error("Zoom meeting creation failed (falling back to Google Meet): {}", e.getMessage());
            return Optional.empty();
        }
    }
}
