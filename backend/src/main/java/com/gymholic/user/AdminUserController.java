package com.gymholic.user;

import com.gymholic.common.response.ApiResponse;
import com.gymholic.security.SecurityUtils;
import com.gymholic.user.dto.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin user management — activate / deactivate accounts. Class lives under
 * /api/admin/** so Spring Security already restricts it to the ADMIN role.
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AccountService accountService;

    /** body: {"active": true|false} — emails the account owner either way. */
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<UserDto>> setUserStatus(
            @PathVariable Long id, @RequestBody Map<String, Boolean> request) {
        Boolean active = request.get("active");
        if (active == null) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("\"active\" (true/false) is required."));
        }
        UserDto user = accountService.setUserActive(id, active, SecurityUtils.getCurrentUserEmail());
        return ResponseEntity.ok(ApiResponse.success(
            active ? "Account activated" : "Account deactivated", user));
    }
}
