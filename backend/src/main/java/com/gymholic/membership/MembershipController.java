package com.gymholic.membership;

import com.gymholic.common.enums.Role;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.common.response.ApiResponse;
import com.gymholic.order.OrderItemRepository;
import com.gymholic.order.OrderRepository;
import com.gymholic.order.entity.Order;
import com.gymholic.security.SecurityUtils;
import com.gymholic.settings.SettingsService;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import com.gymholic.whitelist.WhitelistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/*!
 * Academy membership lifecycle. The membership itself is an ACADEMY order
 * item (PAID = active); cancelling flips that order to REFUNDED and drops
 * the Academy whitelist seat. Whether members may self-cancel is an admin
 * setting (ACADEMY_MEMBERSHIP_CANCELLABLE) — refunds are settled manually
 * by an admin; this endpoint never moves money.
 */
@Slf4j
@RestController
@RequestMapping("/api/membership")
@RequiredArgsConstructor
public class MembershipController {

    private static final String ACADEMY_PREPURCHASE_SOURCE = "ACADEMY_PREPURCHASE";

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final WhitelistRepository whitelistRepository;
    private final SettingsService settingsService;

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> status() {
        User user = currentUser();
        Order membershipOrder = latestMembershipOrder(user);
        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "active", membershipOrder != null && membershipOrder.getStatus() == Order.Status.PAID,
            "cancelled", membershipOrder != null && membershipOrder.getStatus() == Order.Status.REFUNDED,
            "orderId", membershipOrder != null ? membershipOrder.getId() : 0,
            "memberSince", membershipOrder != null && membershipOrder.getCreatedAt() != null
                ? membershipOrder.getCreatedAt().toString() : "",
            "cancellable", settingsService.getBool("ACADEMY_MEMBERSHIP_CANCELLABLE", true))));
    }

    /** Cancels the active membership: order → REFUNDED, whitelist seat removed. */
    @PostMapping("/cancel")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> cancel() {
        if (!settingsService.getBool("ACADEMY_MEMBERSHIP_CANCELLABLE", true)) {
            throw new BadRequestException(
                "Membership cancellation is currently disabled — contact support for help with your membership.");
        }
        User user = currentUser();
        Order order = latestMembershipOrder(user);
        if (order == null || order.getStatus() != Order.Status.PAID) {
            throw new ResourceNotFoundException("Active membership", "user", user.getEmail());
        }

        order.setStatus(Order.Status.REFUNDED);
        orderRepository.save(order);

        whitelistRepository.findByEmailAndSourceIgnoreCase(user.getEmail(), ACADEMY_PREPURCHASE_SOURCE)
            .ifPresent(whitelistRepository::delete);

        log.info("Academy membership cancelled for {} (order #{} marked REFUNDED — refund to be settled manually)",
            user.getEmail(), order.getId());
        return ResponseEntity.ok(ApiResponse.success("Membership cancelled", Map.of(
            "orderId", order.getId(),
            "status", Order.Status.REFUNDED.name())));
    }

    private Order latestMembershipOrder(User user) {
        List<Long> orderIds = orderItemRepository.findOrderIdsByUserIdAndProductType(user.getId(), "ACADEMY");
        if (orderIds.isEmpty()) {
            return null;
        }
        return orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
            .filter(o -> orderIds.contains(o.getId())
                && (o.getStatus() == Order.Status.PAID || o.getStatus() == Order.Status.REFUNDED))
            .findFirst()
            .orElse(null);
    }

    private User currentUser() {
        String email = SecurityUtils.getCurrentUserEmail();
        if (email == null) throw new IllegalStateException("Not authenticated");
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }
}
