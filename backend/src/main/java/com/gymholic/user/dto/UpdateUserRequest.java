package com.gymholic.user.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    @Size(min = 1, max = 100, message = "First name must be between 1 and 100 characters")
    @Pattern(regexp = "\\p{L}[\\p{L}\\s'.\\-]*", message = "First name may only contain letters, spaces, apostrophes, hyphens and periods")
    private String firstName;

    @Size(min = 1, max = 100, message = "Last name must be between 1 and 100 characters")
    @Pattern(regexp = "\\p{L}[\\p{L}\\s'.\\-]*", message = "Last name may only contain letters, spaces, apostrophes, hyphens and periods")
    private String lastName;

    /**
     * NOT a way to set a new number — phone changes must go through the SMS
     * verification flow (POST /users/me/phone/change-request). Here the
     * service only accepts the already-verified number (reformatted) or a
     * clear; anything else is rejected.
     */
    @Pattern(regexp = "\\+?[0-9\\s\\-().]{0,24}", message = "Phone may only contain digits, spaces, ( ) - . and a leading +")
    private String phone;

    @Size(max = 1000, message = "Bio must be at most 1000 characters")
    private String bio;

    @Size(max = 512, message = "Profile picture URL is too long")
    private String profileImageUrl;

    /** IANA timezone ID (e.g. "Africa/Casablanca") — interpreted for availability windows. */
    private String timezone;
}
