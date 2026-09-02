package com.gymholic.support;

import com.gymholic.common.enums.Role;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.common.response.ApiResponse;
import com.gymholic.common.util.WebUtils;
import com.gymholic.notification.NotificationService;
import com.gymholic.security.RateLimitService;
import com.gymholic.security.SecurityUtils;
import com.gymholic.settings.SettingsService;
import com.gymholic.support.dto.CreateSupportMessageRequest;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The client support channel. A complaint submitted from /contact is
 * persisted FIRST (the record is the source of truth), then emailed to the
 * team with the client's address as reply-to, and acknowledged to the
 * client — so nothing depends on a single email arriving.
 */
@Slf4j
@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor
public class SupportController {

    private static final Set<String> CATEGORIES =
        Set.of("BOOKING", "PAYMENT", "DIGITAL_PRODUCT", "ACCOUNT", "OTHER");
    private static final int MAX_PER_EMAIL_PER_DAY = 5;

    private final SupportMessageRepository supportMessageRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final RateLimitService rateLimitService;
    private final SettingsService settingsService;

    /** Public: submit a support request. Rate-limited per IP and per email. */
    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<SupportMessage>> submit(
            @Valid @RequestBody CreateSupportMessageRequest request) {
        String ip = WebUtils.clientIp();
        if (rateLimitService.isOverLimit(RateLimitService.KEY_SUPPORT, ip)) {
            throw new BadRequestException("Too many messages from this connection — please try again later.");
        }
        if (supportMessageRepository.countByEmailAndCreatedAtAfter(
                request.getEmail(), LocalDateTime.now().minusDays(1)) >= MAX_PER_EMAIL_PER_DAY) {
            throw new BadRequestException("You've sent several messages already — we're on them. Please wait a little.");
        }

        String category = CATEGORIES.contains(request.getCategory().toUpperCase())
            ? request.getCategory().toUpperCase() : "OTHER";

        SupportMessage saved = supportMessageRepository.save(SupportMessage.builder()
            .name(request.getName())
            .email(request.getEmail())
            .userId(userRepository.findByEmail(request.getEmail()).map(User::getId).orElse(null))
            .category(category)
            .subject(request.getSubject())
            .message(request.getMessage())
            .build());

        // The record is saved regardless; the team alert needs an admin
        // recipient, the client acknowledgment never does.
        String adminRecipient = resolveAdminRecipient();
        if (adminRecipient != null) {
            notificationService.sendSupportAdminAlert(
                adminRecipient, request.getName(), request.getEmail(),
                categoryLabel(category), request.getSubject(), request.getMessage());
        } else {
            log.warn("Support message #{} received but no admin recipient is configured (set ADMIN_NOTIFY_EMAIL)",
                saved.getId());
        }
        notificationService.sendSupportAcknowledgment(request.getEmail(), request.getName(), request.getSubject());

        log.info("Support message #{} submitted by {} ({})", saved.getId(), saved.getEmail(), category);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Message received — we'll get back to you shortly", saved));
    }

    /** Admin inbox: every support message, newest first. */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<SupportMessage>>> list(
            @RequestParam(defaultValue = "ALL") String status) {
        List<SupportMessage> messages = "NEW".equalsIgnoreCase(status) || "RESOLVED".equalsIgnoreCase(status)
            ? supportMessageRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase())
            : supportMessageRepository.findAllByOrderByCreatedAtDesc();
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    /** Admin action: mark a message as handled. */
    @PutMapping("/{id}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<SupportMessage>> resolve(@PathVariable Long id) {
        SupportMessage message = supportMessageRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Support message", "id", id));
        message.setStatus("RESOLVED");
        supportMessageRepository.save(message);
        return ResponseEntity.ok(ApiResponse.success("Message marked as resolved", message));
    }

    /** ADMIN_NOTIFY_EMAIL override, else the first admin account; null when neither exists. */
    private String resolveAdminRecipient() {
        String override = settingsService.getString("ADMIN_NOTIFY_EMAIL", "");
        if (override != null && !override.isBlank()) {
            return override;
        }
        return userRepository.findFirstByRoleOrderByCreatedAtAsc(Role.ADMIN)
            .map(User::getEmail)
            .orElse(null);
    }

    private static String categoryLabel(String category) {
        return switch (category) {
            case "BOOKING" -> "Booking & scheduling";
            case "PAYMENT" -> "Payment & refund";
            case "DIGITAL_PRODUCT" -> "Digital product";
            case "ACCOUNT" -> "Account";
            default -> "General";
        };
    }
}
