package com.gymholic.security;

import com.gymholic.common.util.WebUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

/**
 * Sliding-window limits on the credential-sensitive endpoints: password
 * login, registration, OTP requests, password resets and admin login.
 * Over the limit → 429 with the standard error envelope.
 */
@Component
@RequiredArgsConstructor
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;

    private static final Map<String, String> POST_RULES = Map.of(
        "/api/auth/login", RateLimitService.KEY_LOGIN,
        "/api/auth/google/signin", RateLimitService.KEY_GOOGLE,
        "/api/auth/register", RateLimitService.KEY_REGISTER,
        "/api/auth/otp/request", RateLimitService.KEY_OTP_REQUEST,
        "/api/auth/otp/verify", RateLimitService.KEY_OTP_VERIFY,
        "/api/auth/resend-verification", RateLimitService.KEY_RESEND,
        "/api/auth/forgot-password", RateLimitService.KEY_FORGOT,
        "/api/admin/auth/login", RateLimitService.KEY_ADMIN_LOGIN);

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if ("POST".equals(request.getMethod())) {
            String ruleKey = POST_RULES.get(request.getRequestURI());
            if (ruleKey != null && rateLimitService.isOverLimit(ruleKey, WebUtils.clientIp())) {
                response.setStatus(429);
                response.setContentType("application/json");
                response.getWriter().write(
                    "{\"success\":false,\"message\":\"Too many attempts. Please wait a few minutes and try again.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
