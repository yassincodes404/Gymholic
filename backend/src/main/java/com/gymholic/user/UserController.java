package com.gymholic.user;

import com.gymholic.common.response.ApiResponse;
import com.gymholic.security.SecurityUtils;
import com.gymholic.user.dto.UpdateUserRequest;
import com.gymholic.user.dto.UserDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AccountService accountService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser() {
        String email = SecurityUtils.getCurrentUserEmail();
        UserDto user = userService.getUserByEmail(email);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> updateCurrentUser(
            @Valid @RequestBody UpdateUserRequest request) {
        String email = SecurityUtils.getCurrentUserEmail();
        UserDto user = userService.updateUser(email, request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated", user));
    }

    /** Uploads (or replaces) the profile picture; returns the refreshed profile. */
    @PutMapping("/me/avatar")
    public ResponseEntity<ApiResponse<UserDto>> uploadAvatar(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        UserDto user = userService.updateAvatar(SecurityUtils.getCurrentUserEmail(), file);
        return ResponseEntity.ok(ApiResponse.success("Profile picture updated", user));
    }

    /** Removes the profile picture. */
    @org.springframework.web.bind.annotation.DeleteMapping("/me/avatar")
    public ResponseEntity<ApiResponse<UserDto>> deleteAvatar() {
        UserDto user = userService.clearAvatar(SecurityUtils.getCurrentUserEmail());
        return ResponseEntity.ok(ApiResponse.success("Profile picture removed", user));
    }

    /**
     * Public avatar serving — the URL users.profile_image_url points at.
     * Responses cache hard; the ?v= upload-time version in the URL is what
     * busts every client's cached copy on re-upload.
     */
    @GetMapping("/{id}/avatar")
    public ResponseEntity<byte[]> getAvatar(@PathVariable Long id) {
        UserAvatar avatar = userService.getAvatar(id);
        return ResponseEntity.ok()
            .header("Cache-Control", "public, max-age=604800, immutable")
            .header("Content-Type", avatar.getContentType())
            .header("Content-Length", String.valueOf(avatar.getData().length))
            .body(avatar.getData());
    }

    /** Changes the password after re-checking the current one; emails a confirmation. */
    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestBody Map<String, String> request) {
        accountService.changePassword(
            SecurityUtils.getCurrentUserEmail(),
            request.get("currentPassword"),
            request.get("newPassword"));
        return ResponseEntity.ok(ApiResponse.success("Password changed", null));
    }

    /** Step 1 of an email change — sends a confirmation code to the new address. */
    @PostMapping("/me/email/change-request")
    public ResponseEntity<ApiResponse<Void>> requestEmailChange(
            @RequestBody Map<String, String> request) {
        accountService.requestEmailChange(
            SecurityUtils.getCurrentUserEmail(), request.get("newEmail"));
        return ResponseEntity.ok(ApiResponse.success(
            "Confirmation code sent to the new address.", null));
    }

    /** Step 2 of an email change — applies it after the code check. */
    @PostMapping("/me/email/confirm")
    public ResponseEntity<ApiResponse<UserDto>> confirmEmailChange(
            @RequestBody Map<String, String> request) {
        // Look the user up by the CURRENT address before the switch.
        UserDto before = userService.getUserByEmail(SecurityUtils.getCurrentUserEmail());
        accountService.confirmEmailChange(before.getEmail(), request.get("code"));
        UserDto after = userService.getUserById(before.getId());
        return ResponseEntity.ok(ApiResponse.success("Email address updated", after));
    }

    /** Soft-deletes (anonymises) the account after password re-check. */
    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(
            @RequestBody Map<String, String> request) {
        accountService.deleteAccount(
            SecurityUtils.getCurrentUserEmail(), request.get("password"));
        return ResponseEntity.ok(ApiResponse.success("Account deleted", null));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUserById(@PathVariable Long id) {
        UserDto user = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<UserDto>>> getAllUsers(Pageable pageable) {
        Page<UserDto> users = userService.getAllUsers(pageable);
        return ResponseEntity.ok(ApiResponse.success(users));
    }
}
