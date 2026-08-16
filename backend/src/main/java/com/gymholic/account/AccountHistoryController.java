package com.gymholic.account;

import com.gymholic.account.dto.PurchaseHistoryDto;
import com.gymholic.common.response.ApiResponse;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.security.SecurityUtils;
import com.gymholic.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountHistoryController {

    private final AccountHistoryService accountHistoryService;
    private final UserRepository userRepository;

    /** The signed-in client's full purchase history (bookings + products). */
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<PurchaseHistoryDto>>> myHistory() {
        String email = SecurityUtils.getCurrentUserEmail();
        if (email == null) throw new IllegalStateException("Not authenticated");
        Long userId = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email))
            .getId();
        return ResponseEntity.ok(ApiResponse.success(accountHistoryService.getHistory(userId)));
    }
}
