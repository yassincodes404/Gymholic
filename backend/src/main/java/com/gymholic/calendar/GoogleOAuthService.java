package com.gymholic.calendar;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.calendar.CalendarScopes;
import com.gymholic.calendar.dto.GoogleConnectionStatusDto;
import com.gymholic.calendar.entity.GoogleConnection;
import com.gymholic.calendar.repository.GoogleConnectionRepository;
import com.gymholic.calendar.util.EncryptionUtil;
import com.gymholic.user.entity.User;
import com.gymholic.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.StringReader;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleOAuthService {

    private final GoogleConnectionRepository connectionRepository;
    private final UserRepository userRepository;
    private final EncryptionUtil encryptionUtil;
    private final StringRedisTemplate redisTemplate;

    @Value("${google.client.id:}")
    private String clientId;

    @Value("${google.client.secret:}")
    private String clientSecret;

    @Value("${google.redirect.uri:}")
    private String redirectUri;

    private static final List<String> SCOPES = List.of(
        CalendarScopes.CALENDAR,
        "https://www.googleapis.com/auth/userinfo.email" // to store the connected account email
    );
    private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final NetHttpTransport HTTP_TRANSPORT = new NetHttpTransport();
    private static final String STATE_CACHE_PREFIX = "oauth_state:";

    private GoogleAuthorizationCodeFlow getFlow() throws Exception {
        String clientSecretsJson = String.format(
            "{\"web\":{\"client_id\":\"%s\",\"client_secret\":\"%s\"}}",
            clientId, clientSecret
        );

        GoogleClientSecrets secrets = GoogleClientSecrets.load(JSON_FACTORY, new StringReader(clientSecretsJson));

        return new GoogleAuthorizationCodeFlow.Builder(
                HTTP_TRANSPORT, JSON_FACTORY, secrets, SCOPES)
                .setAccessType("offline")
                .setApprovalPrompt("force") // Forces refresh token generation
                .build();
    }

    private String generateSecureState() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String getAuthorizationUrl(Long userId) {
        try {
            String state = generateSecureState();
            // Store state in Redis with 10-minute TTL linked to the userId
            redisTemplate.opsForValue().set(STATE_CACHE_PREFIX + state, userId.toString(), 10, TimeUnit.MINUTES);

            return getFlow().newAuthorizationUrl()
                    .setRedirectUri(redirectUri)
                    .setState(state)
                    .build();
        } catch (Exception e) {
            log.error("Failed to generate Google Auth URL", e);
            throw new RuntimeException("Failed to generate Google Auth URL", e);
        }
    }

    @Transactional
    public void exchangeCodeForToken(String code, String state) {
        try {
            // 1. Validate and consume the state
            String cacheKey = STATE_CACHE_PREFIX + state;
            String userIdStr = redisTemplate.opsForValue().get(cacheKey);

            if (userIdStr == null) {
                log.warn("Invalid or expired OAuth state provided: {}", state);
                throw new RuntimeException("Invalid or expired authorization session. Please try connecting again.");
            }

            // Immediately delete the state to ensure single-use
            redisTemplate.delete(cacheKey);

            Long userId = Long.valueOf(userIdStr);

            log.info("Exchanging authorization code for user {}", userId);
            log.debug("Using redirect URI: {}", redirectUri);
            log.debug("Using client ID: {}", clientId);
            // Never log client secret or authorization code!

            // 2. Exchange code for tokens
            GoogleTokenResponse response = getFlow().newTokenRequest(code)
                    .setRedirectUri(redirectUri)
                    .execute();

            String refreshToken = response.getRefreshToken();
            if (refreshToken == null) {
                log.warn("No refresh token received for user {}. They may need to revoke access and try again.", userId);
                throw new RuntimeException("No refresh token received. Please revoke access in Google and try again.");
            }

            log.info("Successfully received refresh token for user {}", userId);

            // Fetch the connected account's real email from Google's userinfo endpoint.
            String googleEmail = fetchGoogleEmail(response.getAccessToken());

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String encryptedRefreshToken = encryptionUtil.encrypt(refreshToken);

            GoogleConnection connection = connectionRepository.findByUserId(userId)
                    .orElse(GoogleConnection.builder().user(user).build());

            connection.setGoogleEmail(googleEmail);
            connection.setEncryptedRefreshToken(encryptedRefreshToken);
            
            connectionRepository.save(connection);

            log.info("Google Calendar connection saved successfully for user {}", userId);

        } catch (RuntimeException e) {
            throw e; // Re-throw business logic exceptions
        } catch (com.google.api.client.googleapis.json.GoogleJsonResponseException e) {
            log.error("Google API error during token exchange: status={}, message={}", 
                     e.getStatusCode(), e.getMessage());
            log.error("Error details: {}", e.getDetails());
            throw new RuntimeException("Failed to connect Google Calendar: " + e.getMessage(), e);
        } catch (com.google.api.client.auth.oauth2.TokenResponseException e) {
            log.error("Token exchange failed: status={}, error={}, error_description={}", 
                     e.getStatusCode(), e.getDetails() != null ? e.getDetails().getError() : "unknown",
                     e.getDetails() != null ? e.getDetails().getErrorDescription() : "no description");
            throw new RuntimeException("Failed to connect Google Calendar: Invalid client credentials or authorization code", e);
        } catch (Exception e) {
            log.error("Failed to exchange code for token", e);
            throw new RuntimeException("Failed to connect Google Calendar", e);
        }
    }

    /**
     * Looks up the Google account's email with the just-issued access token.
     * Never fails the connection — falls back to a placeholder if the call fails.
     */
    private String fetchGoogleEmail(String accessToken) {
        try {
            org.springframework.web.client.RestTemplate rest = new org.springframework.web.client.RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setBearerAuth(accessToken);
            var response = rest.exchange(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                org.springframework.http.HttpMethod.GET,
                new org.springframework.http.HttpEntity<>(headers),
                String.class
            );
            com.google.gson.JsonObject json = com.google.gson.JsonParser.parseString(response.getBody()).getAsJsonObject();
            if (json.has("email") && !json.get("email").isJsonNull()) {
                return json.get("email").getAsString();
            }
        } catch (Exception e) {
            log.warn("Could not fetch Google account email: {}", e.getMessage());
        }
        return "connected-google-account";
    }

    @Transactional(readOnly = true)
    public GoogleConnectionStatusDto getConnectionStatus(Long userId) {
        return connectionRepository.findByUserId(userId)
                .map(conn -> new GoogleConnectionStatusDto(true, conn.getGoogleEmail()))
                .orElse(new GoogleConnectionStatusDto(false, null));
    }

    @Transactional
    public void disconnect(Long userId) {
        connectionRepository.deleteByUserId(userId);
    }
}