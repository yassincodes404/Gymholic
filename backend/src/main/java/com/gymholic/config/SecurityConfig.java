package com.gymholic.config;

import com.gymholic.security.AdminAccessKeyFilter;
import com.gymholic.security.AuthRateLimitFilter;
import com.gymholic.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.AuthenticationEntryPoint;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AuthRateLimitFilter authRateLimitFilter;
    private final AdminAccessKeyFilter adminAccessKeyFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpStatus.UNAUTHORIZED.value());
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"" + authException.getMessage() + "\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(HttpStatus.FORBIDDEN.value());
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"Email verification required. Confirm your email with the code we sent you, then try again.\"}");
                })
            )
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/admin/auth/**").permitAll() // Admin login is public
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .requestMatchers("/api/payments/webhook/**").permitAll()
                .requestMatchers("/api/payments/active-provider").permitAll()
                .requestMatchers("/api/integrations/google/callback").permitAll()
                .requestMatchers("/api/integrations/google/risc").permitAll() // Cross-Account Protection push (JWT-verified)
                .requestMatchers(HttpMethod.POST, "/api/whitelist").permitAll() // Join waitlist (guest-friendly)
                .requestMatchers(HttpMethod.GET, "/api/settings/pricing").permitAll() // Public booking prices
                .requestMatchers("/api/bookings/reschedule/**").permitAll() // One-time no-show reschedule links (token-protected)
                .requestMatchers(HttpMethod.POST, "/api/v1/assessments").permitAll() // Start assessment
                .requestMatchers(HttpMethod.PUT, "/api/v1/assessments/*").permitAll() // Update assessment
                .requestMatchers(HttpMethod.POST, "/api/v1/assessments/*/submit").permitAll() // Submit assessment
                .requestMatchers(HttpMethod.GET, "/api/v1/assessments/*").permitAll() // Get specific assessment
                // Store browsing works for guests; PDF streaming and the library
                // stay authenticated (default rule below).
                .requestMatchers(HttpMethod.GET, "/api/store/categories", "/api/store/products", "/api/store/products/*", "/api/store/products/*/cover").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/users/*/avatar").permitAll() // Public profile pictures (versioned URLs)
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // No payments, orders, cart, bookings or membership until the
                // email is confirmed
                .requestMatchers("/api/payments/**", "/api/orders/**", "/api/cart/**", "/api/bookings/**", "/api/membership/**")
                    .hasAuthority("EMAIL_VERIFIED")
                // Admin endpoints require ADMIN role
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/store/admin/**").hasRole("ADMIN")
                // Everything else requires authentication
                .anyRequest().authenticated()
            )
            .addFilterBefore(adminAccessKeyFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(authRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
