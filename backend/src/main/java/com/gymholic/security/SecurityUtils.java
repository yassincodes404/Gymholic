package com.gymholic.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

public final class SecurityUtils {

    private SecurityUtils() {
        // Utility class — no instantiation
    }

    /**
     * Returns the email of the currently authenticated user.
     */
    public static String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }
        return principal.toString();
    }

    /**
     * Returns the ID of the currently authenticated user.
     * Note: This requires the JWT to contain user ID claims.
     */
    public static Long getCurrentUserId() {
        // TODO: Extract user ID from JWT claims or load from database using email
        String email = getCurrentUserEmail();
        if (email == null) {
            throw new RuntimeException("No authenticated user found");
        }
        // This is a temporary implementation - should be optimized to extract from JWT
        return null; // Will be implemented when needed
    }

    /**
     * Checks whether the current user has a specific role.
     */
    public static boolean hasRole(String role) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        return authentication.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_" + role));
    }
}
