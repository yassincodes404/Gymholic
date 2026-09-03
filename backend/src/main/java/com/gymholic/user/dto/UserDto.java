package com.gymholic.user.dto;

import com.gymholic.common.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {

    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private boolean phoneVerified;
    /** Global policy flag: bookings/orders are blocked until phoneVerified is true. */
    private boolean phoneVerificationRequired;
    private Role role;
    private String profileImageUrl;
    private String bio;
    private String timezone;
    private boolean active;
    private LocalDateTime createdAt;
}
