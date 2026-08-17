package com.gymholic.auth.dto;

import com.gymholic.common.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long userId;
    private String email;
    private String firstName;
    private String lastName;
    private Role role;
    private Boolean emailVerified;

    /**
     * True when the account still needs email confirmation: instead of
     * tokens the response only carries the email, and the client should
     * ask for the 6-digit code that was just sent out.
     */
    private Boolean verificationRequired;
}
