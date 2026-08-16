package com.gymholic.whitelist;

import com.gymholic.common.response.ApiResponse;
import com.gymholic.security.SecurityUtils;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import com.gymholic.whitelist.dto.JoinWhitelistRequest;
import com.gymholic.whitelist.dto.WhitelistEntryDto;
import com.gymholic.whitelist.entity.WhitelistEntry;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/whitelist")
@RequiredArgsConstructor
public class WhitelistController {

    private final WhitelistRepository whitelistRepository;
    private final UserRepository userRepository;

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
