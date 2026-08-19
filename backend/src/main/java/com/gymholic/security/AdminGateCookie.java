package com.gymholic.security;

import com.gymholic.common.util.WebUtils;

/**
 * The frontend middleware 404s /admin/** unless the browser carries the
 * gh_admin_gate cookie (normally set by the ?key= knock URL). Successful
 * ADMIN authentication sets the same cookie directly, so the owner and any
 * bootstrap-listed expert can sign in through the normal /login page and
 * land straight on the dashboard — no knock URL needed. Unauthenticated
 * visitors still see a plain 404.
 */
public final class AdminGateCookie {

    public static final String NAME = "gh_admin_gate";

    private AdminGateCookie() {
    }

    /** Set-Cookie value for granting the admin gate (90 days). */
    public static String setCookieValue() {
        StringBuilder cookie = new StringBuilder(NAME + "=1");
        cookie.append("; Path=/");
        cookie.append("; Max-Age=").append(90L * 24 * 60 * 60);
        cookie.append("; SameSite=Strict");
        cookie.append("; HttpOnly");
        var request = WebUtils.currentRequest();
        if (request != null && request.isSecure()) {
            cookie.append("; Secure");
        }
        return cookie.toString();
    }
}
