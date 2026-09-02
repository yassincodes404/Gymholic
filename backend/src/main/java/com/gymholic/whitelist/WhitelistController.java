package com.gymholic.whitelist;

import com.gymholic.common.response.ApiResponse;
import com.gymholic.notification.NotificationService;
import com.gymholic.security.SecurityUtils;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import com.gymholic.whitelist.dto.JoinWhitelistRequest;
import com.gymholic.whitelist.dto.WhitelistEntryDto;
import com.gymholic.whitelist.entity.WhitelistEntry;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/whitelist")
@RequiredArgsConstructor
public class WhitelistController {

    private final WhitelistRepository whitelistRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /** Public: join the waitlist (Academy, upcoming features). Idempotent per email+source. */
    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<WhitelistEntryDto>> join(@Valid @RequestBody JoinWhitelistRequest request) {
        String source = request.getSource() == null || request.getSource().isBlank()
            ? "ACADEMY" : request.getSource().toUpperCase();

        WhitelistEntry entry = whitelistRepository.findByEmailAndSourceIgnoreCase(request.getEmail(), source)
            .orElseGet(() -> WhitelistEntry.builder().email(request.getEmail()).source(source).build());

        // Keep the latest name; link to a user account when the email matches one.
        if (request.getName() != null && !request.getName().isBlank()) {
            entry.setName(request.getName());
        }
        if (entry.getUserId() == null) {
            userRepository.findByEmail(request.getEmail()).map(User::getId)
                .ifPresent(entry::setUserId);
        }

        WhitelistEntry saved = whitelistRepository.save(entry);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("You're on the list", toDto(saved)));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<WhitelistEntryDto>>> list() {
        List<WhitelistEntryDto> entries = whitelistRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(this::toDto)
            .toList();
        return ResponseEntity.ok(ApiResponse.success(entries));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        whitelistRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Entry removed", null));
    }

    /**
     * Admin action for launch day: queue the Academy launch email to every
     * person on the whitelist. Idempotent — entries already notified are
     * skipped unless {@code force} is set, so a double click can't spam.
     */
    @PostMapping("/notify")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> notifyAll(
            @RequestParam(defaultValue = "false") boolean force) {
        List<WhitelistEntry> entries = whitelistRepository.findAllByOrderByCreatedAtDesc();
        int queued = 0;
        int alreadyNotified = 0;
        for (WhitelistEntry entry : entries) {
            if (entry.isNotified() && !force) {
                alreadyNotified++;
                continue;
            }
            boolean earlyAccess = "ACADEMY_PREPURCHASE".equalsIgnoreCase(entry.getSource());
            notificationService.sendAcademyLaunch(entry.getEmail(), entry.getName(), earlyAccess);
            entry.setNotified(true);
            whitelistRepository.save(entry);
            queued++;
        }
        log.info("Academy launch announcement queued for {} whitelist member(s) ({} already notified)",
            queued, alreadyNotified);
        return ResponseEntity.ok(ApiResponse.success(
            "Launch announcement queued for " + queued + " member(s)",
            Map.of("queued", queued, "alreadyNotified", alreadyNotified, "total", entries.size())));
    }

    private WhitelistEntryDto toDto(WhitelistEntry entry) {
        return WhitelistEntryDto.builder()
            .id(entry.getId())
            .email(entry.getEmail())
            .name(entry.getName())
            .source(entry.getSource())
            .notified(entry.isNotified())
            .createdAt(entry.getCreatedAt())
            .build();
    }
}
