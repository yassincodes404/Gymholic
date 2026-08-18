package com.gymholic.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory sliding-window rate limiter for the auth endpoints. Single
 * instance per backend container is enough — the goal is to stop brute
 * force and email flooding, not to meter traffic.
 */
@Component
public class RateLimitService {

    public static final String KEY_LOGIN = "auth:login";
    public static final String KEY_REGISTER = "auth:register";
    public static final String KEY_GOOGLE = "auth:google";
    public static final String KEY_OTP_REQUEST = "auth:otp-request";
    public static final String KEY_OTP_VERIFY = "auth:otp-verify";
    public static final String KEY_RESEND = "auth:resend";
    public static final String KEY_FORGOT = "auth:forgot";
    public static final String KEY_ADMIN_LOGIN = "admin:login";

    private record Window(int maxEvents, long windowSeconds) {
    }

    private final Map<String, Window> rules = Map.of(
        KEY_LOGIN, new Window(10, 300),
        KEY_GOOGLE, new Window(10, 300),
        KEY_REGISTER, new Window(10, 3600),
        KEY_OTP_REQUEST, new Window(5, 900),
        KEY_OTP_VERIFY, new Window(20, 900),
        KEY_RESEND, new Window(5, 900),
        KEY_FORGOT, new Window(5, 900),
        KEY_ADMIN_LOGIN, new Window(8, 600));

    private final Map<String, Deque<Instant>> hits = new ConcurrentHashMap<>();

    /** Records an event and reports whether the key is now over the limit. */
    public boolean isOverLimit(String ruleKey, String identity) {
        Window window = rules.get(ruleKey);
        if (window == null) {
            return false;
        }
        Instant now = Instant.now();
        Instant cutoff = now.minusSeconds(window.windowSeconds());
        Deque<Instant> events = hits.computeIfAbsent(ruleKey + ":" + identity, k -> new ArrayDeque<>());
        synchronized (events) {
            while (!events.isEmpty() && events.peekFirst().isBefore(cutoff)) {
                events.removeFirst();
            }
            if (events.size() >= window.maxEvents()) {
                return true;
            }
            events.addLast(now);
            return false;
        }
    }
}
