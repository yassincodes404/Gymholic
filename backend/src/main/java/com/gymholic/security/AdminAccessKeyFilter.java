package com.gymholic.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Hides the admin authentication endpoint from anyone without the shared
 * access key: requests missing a matching X-Admin-Access-Key header get a
 * plain 404, indistinguishable from a route that does not exist. The rest
 * of /api/admin/** is already locked to the ADMIN role by Spring Security.
 *
 * The key itself never ships to the browser — the Next.js server injects
 * the header when proxying the gated admin login page.
 */
@Component
@RequiredArgsConstructor
public class AdminAccessKeyFilter extends OncePerRequestFilter {

    @Value("${app.admin.access-key:}")
    private String adminAccessKey;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (request.getRequestURI().startsWith("/api/admin/auth/")
                && adminAccessKey != null && !adminAccessKey.isBlank()) {
            String provided = request.getHeader("X-Admin-Access-Key");
            if (provided == null || !constantTimeEquals(provided, adminAccessKey)) {
                response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                response.setContentType("application/json");
                response.getWriter().write(
                    "{\"success\":false,\"message\":\"Endpoint not found: " + request.getRequestURI() + "\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(
            a.getBytes(StandardCharsets.UTF_8),
            b.getBytes(StandardCharsets.UTF_8));
    }
}
