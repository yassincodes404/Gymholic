package com.gymholic.common.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** Client identity helpers that work behind the Traefik edge proxy. */
public final class WebUtils {

    private WebUtils() {
    }

    /** Current request, or null when called outside a request thread. */
    public static HttpServletRequest currentRequest() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            return attrs.getRequest();
        }
        return null;
    }

    /** First hop of X-Forwarded-For (set by Traefik), else the socket address. */
    public static String clientIp() {
        HttpServletRequest request = currentRequest();
        if (request == null) {
            return "unknown";
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    public static String userAgent() {
        HttpServletRequest request = currentRequest();
        return request != null && request.getHeader("User-Agent") != null
            ? request.getHeader("User-Agent")
            : "unknown";
    }

    /** Human-friendly label for common User-Agent strings ("Chrome on Windows"). */
    public static String describeUserAgent(String ua) {
        if (ua == null || ua.isBlank() || "unknown".equals(ua)) {
            return "Unknown device";
        }
        String browser = "Unknown browser";
        if (ua.contains("Edg/")) browser = "Edge";
        else if (ua.contains("OPR/")) browser = "Opera";
        else if (ua.contains("Chrome/") && !ua.contains("Chromium")) browser = "Chrome";
        else if (ua.contains("Safari/") && !ua.contains("Chrome")) browser = "Safari";
        else if (ua.contains("Firefox/")) browser = "Firefox";

        String os = "Unknown OS";
        if (ua.contains("Windows")) os = "Windows";
        else if (ua.contains("Android")) os = "Android";
        else if (ua.contains("iPhone") || ua.contains("iPad")) os = "iOS";
        else if (ua.contains("Mac OS X")) os = "macOS";
        else if (ua.contains("Linux")) os = "Linux";

        return browser + " on " + os;
    }
}
