package com.gymholic.calendar;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.gymholic.calendar.repository.GoogleConnectionRepository;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PreDestroy;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/*!
 * Receiver for Google Cross-Account Protection (RISC) — the security-event
 * stream that lets Google tell us, out of band, that something happened to
 * a Google account we hold a link for (sign-in profile or calendar refresh
 * token). Events arrive as signed SET JWTs POSTed to
 * /api/integrations/google/risc (public; registered in the Google Cloud
 * console). Signature, issuer and audience are verified against Google's
 * public keys before anything is acted on.
 *
 * Event policy:
 *   account-purged / account-disabled → deactivate the Gymholic account and
 *     drop the calendar connection (the Google account no longer exists or
 *     is suspended — its tokens must not keep working here).
 *   sessions-revoked / tokens-revoked → drop the calendar connection so the
 *     expert must re-consent; app sessions are short-lived stateless JWTs.
 *   anything else → logged and acknowledged; Google's spec requires
 *     receivers to tolerate unknown event types.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleSecurityEventService {

    private static final String RISC_PREFIX = "https://schemas.openid.net/secevent/risc/event-type/";
    private static final String OAUTH_PREFIX = "https://schemas.openid.net/secevent/oauth/event-type/";

    private final UserRepository userRepository;
    private final GoogleConnectionRepository googleConnectionRepository;

    @Value("${google.client.id:}")
    private String clientId;

    /** Verifying a SET fetches Google's public keys over the network — the
     *  executor keeps a slow fetch from parking a request thread forever. */
    private final ExecutorService verifyExecutor = Executors.newFixedThreadPool(2, runnable -> {
        Thread thread = new Thread(runnable, "google-risc-verify");
        thread.setDaemon(true);
        return thread;
    });

    @PreDestroy
    void shutdown() {
        verifyExecutor.shutdownNow();
    }

    /**
     * Verifies the event token and applies it. Returns true when the token
     * was authentic (whether or not it mapped to anything) — false means it
     * failed verification and the caller should reject the request.
     */
    @Transactional
    public boolean handleSecurityEventToken(String setToken) {
        if (setToken == null || setToken.isBlank() || clientId == null || clientId.isBlank()) {
            return false;
        }

        GoogleIdToken token = verify(setToken);
        if (token == null) {
            log.warn("Rejected an unverifiable Cross-Account Protection event token");
            return false;
        }

        String googleSub = token.getPayload().getSubject();
        Object eventsRaw = token.getPayload().get("events");
        if (!(eventsRaw instanceof Map<?, ?> events) || events.isEmpty()) {
            log.warn("Cross-Account Protection token from sub={} carried no events", mask(googleSub));
            return true;
        }

        for (Map.Entry<?, ?> entry : events.entrySet()) {
            applyEvent(String.valueOf(entry.getKey()), googleSub);
        }
        return true;
    }

    private void applyEvent(String eventType, String googleSub) {
        switch (eventType) {
            case RISC_PREFIX + "account-purged", RISC_PREFIX + "account-disabled" -> {
                deactivateByGoogleId(googleSub, eventType);
                dropCalendarConnection(googleSub, eventType);
            }
            case RISC_PREFIX + "sessions-revoked", OAUTH_PREFIX + "tokens-revoked" ->
                dropCalendarConnection(googleSub, eventType);
            case RISC_PREFIX + "password-changed", RISC_PREFIX + "account-enabled" ->
                // Nothing to do: Google-side password changes and re-enablement
                // don't touch Gymholic credentials. Logged for the audit trail.
                log.info("Cross-Account Protection: {} for sub={} (no action required)", eventType, mask(googleSub));
            default ->
                // Unknown event types must be accepted and ignored per the RISC spec.
                log.info("Cross-Account Protection: ignoring unknown event type {}", eventType);
        }
    }

    private void deactivateByGoogleId(String googleSub, String reason) {
        userRepository.findByGoogleId(googleSub).ifPresentOrElse(user -> {
            if (user.isActive()) {
                user.setActive(false);
                userRepository.save(user);
                log.warn("Cross-Account Protection ({}) deactivated user {} (google sub={})",
                    reason, mask(user.getEmail()), mask(googleSub));
            }
        }, () -> log.info("Cross-Account Protection ({}) for unknown sub={} — no matching account",
            reason, mask(googleSub)));
    }

    private void dropCalendarConnection(String googleSub, String reason) {
        googleConnectionRepository.findByGoogleId(googleSub).ifPresentOrElse(connection -> {
            googleConnectionRepository.delete(connection);
            log.warn("Cross-Account Protection ({}) removed the Google Calendar connection of user {} (google email={})",
                reason, connection.getUser() != null ? mask(connection.getUser().getEmail()) : "?",
                mask(connection.getGoogleEmail()));
        }, () -> log.info("Cross-Account Protection ({}) for sub={} — no calendar connection", reason, mask(googleSub)));
    }

    /** Signature, issuer and audience must all check out against Google's public keys. */
    private GoogleIdToken verify(String setToken) {
        try {
            Future<GoogleIdToken> future = verifyExecutor.submit(() -> {
                GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                        new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(clientId))
                    .build();
                return verifier.verify(setToken);
            });
            return future.get(5, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            log.warn("Cross-Account Protection verification timed out fetching Google's keys");
            return null;
        } catch (Exception e) {
            log.warn("Cross-Account Protection token verification failed: {}", e.getMessage());
            return null;
        }
    }

    /** Never log full Google account ids or emails in security-event context. */
    private static String mask(String value) {
        if (value == null || value.isBlank()) return "?";
        int keep = Math.min(3, value.length());
        return value.substring(0, keep) + "…";
    }
}
