package com.gymholic.notification;

import com.gymholic.common.util.DateTimeUtils;
import com.gymholic.common.util.WebUtils;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;

/**
 * Security notification: the first sign-in from a given device (browser +
 * IP combination) emails the account owner. Known devices are remembered in
 * Redis for 180 days. Never throws — a notification failure must not break
 * a successful login.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoginNotificationService {

    private static final String DEVICE_FLAG_PREFIX = "login_device:";
    private static final Duration DEVICE_MEMORY = Duration.ofDays(180);
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("MMMM d, yyyy 'at' HH:mm 'UTC'", Locale.ENGLISH);

    private final StringRedisTemplate redisTemplate;
    private final EmailService emailService;

    public void notifyNewLoginIfNeeded(User user, String method) {
        try {
            String ip = WebUtils.clientIp();
            String userAgent = WebUtils.userAgent();
            String fingerprint = sha256(userAgent + "|" + ip);

            String flagKey = DEVICE_FLAG_PREFIX + user.getId() + ":" + fingerprint;
            Boolean first = redisTemplate.opsForValue().setIfAbsent(flagKey, "1", DEVICE_MEMORY);
            if (!Boolean.TRUE.equals(first)) {
                return; // device already known
            }

            emailService.sendEmail(
                user.getEmail(),
                "New sign-in to your Gymholic account",
                "security-new-login",
                Map.of(
                    "name", safe(user.getFirstName()),
                    "when", WHEN.format(ZonedDateTime.now(ZoneOffset.UTC)),
                    "device", WebUtils.describeUserAgent(userAgent),
                    "ip", ip,
                    "method", method));
        } catch (Exception e) {
            log.error("Could not send new-device notification for {}: {}", user.getEmail(), e.getMessage());
        }
    }

    private String safe(String value) {
        return value != null ? value : "there";
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            return String.valueOf(input.hashCode());
        }
    }
}
