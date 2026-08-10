package com.gymholic.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.gymholic.auth.dto.AuthResponse;
import com.gymholic.common.enums.Role;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.security.JwtService;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleSignInService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Value("${google.client.id}")
    private String googleClientId;

    @Transactional
    public AuthResponse authenticateWithGoogle(String idToken) {
        try {
            // Verify Google ID token
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken token = verifier.verify(idToken);
            if (token == null) {
                throw new BadRequestException("Invalid Google ID token");
            }

            Payload payload = token.getPayload();
            String googleId = payload.getSubject();
            String email = payload.getEmail();
            String firstNameRaw = (String) payload.get("given_name");
            String lastNameRaw = (String) payload.get("family_name");
            
            // Handle null names gracefully - make final for lambda
            final String firstName = (firstNameRaw == null || firstNameRaw.isBlank()) 
                ? email.split("@")[0]  // Use email prefix as fallback
                : firstNameRaw;
            final String lastName = (lastNameRaw == null || lastNameRaw.isBlank()) 
                ? "" 
                : lastNameRaw;

            log.info("Google Sign-In attempt for googleId: {}, email: {}", googleId, email);

            // Find or create user
            User user = userRepository.findByGoogleId(googleId)
                    .orElseGet(() -> {
                        // Check if user exists by email (account linking)
                        return userRepository.findByEmail(email)
                                .map(existingUser -> {
                                    log.info("Linking Google ID to existing account: {}", email);
                                    existingUser.setGoogleId(googleId);
                                    return userRepository.save(existingUser);
                                })
                                .orElseGet(() -> {
                                    log.info("Creating new user from Google Sign-In: {}", email);
                                    // Create new CLIENT user
                                    User newUser = User.builder()
                                            .googleId(googleId)
                                            .email(email)
                                            .firstName(firstName)
                                            .lastName(lastName)
                                            .password("") // No password for Google users
                                            .role(Role.CLIENT) // ALWAYS CLIENT for Google Sign-In
                                            .active(true)
                                            .build();
                                    return userRepository.save(newUser);
                                });
                    });

            // Generate JWT tokens
            UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
            String accessToken = jwtService.generateToken(userDetails);
            String refreshToken = jwtService.generateRefreshToken(userDetails);

            return buildAuthResponse(user, accessToken, refreshToken);

        } catch (BadRequestException e) {
            throw e; // Re-throw our own exceptions
        } catch (Exception e) {
            log.error("Failed to verify Google ID token", e);
            throw new BadRequestException("Failed to authenticate with Google: " + e.getMessage());
        }
    }

    private AuthResponse buildAuthResponse(User user, String accessToken, String refreshToken) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .build();
    }
}
