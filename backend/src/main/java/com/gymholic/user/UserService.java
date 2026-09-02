package com.gymholic.user;

import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.common.util.TimezoneUtils;
import com.gymholic.user.dto.UpdateUserRequest;
import com.gymholic.user.dto.UserDto;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserAvatarRepository userAvatarRepository;

    private static final long MAX_AVATAR_BYTES = 2L * 1024 * 1024;
    private static final Set<String> ALLOWED_AVATAR_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp");

    @Transactional(readOnly = true)
    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return mapToDto(user);
    }

    /**
     * Stores a new profile picture (replacing any previous one) and points
     * profile_image_url at the public serving endpoint with a version
     * parameter so every client's cached copy is bust.
     */
    @Transactional
    public UserDto updateAvatar(String email, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Choose an image to upload.");
        }
        if (file.getSize() > MAX_AVATAR_BYTES) {
            throw new BadRequestException("Profile pictures can be at most 2MB.");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        if (!ALLOWED_AVATAR_TYPES.contains(contentType)) {
            throw new BadRequestException("Profile pictures must be a JPG, PNG or WebP image.");
        }

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception e) {
            throw new BadRequestException("Could not read the uploaded image.");
        }

        UserAvatar avatar = userAvatarRepository.findByUserId(user.getId())
            .orElseGet(() -> UserAvatar.builder().user(user).build());
        avatar.setContentType(contentType);
        avatar.setFileSize(bytes.length);
        avatar.setData(bytes);
        avatar.setUpdatedAt(LocalDateTime.now());
        avatar = userAvatarRepository.save(avatar);

        // Versioned URL — re-uploads reuse the same avatar row, so the version
        // must come from the upload time, not the row id, for caches to bust.
        user.setProfileImageUrl("/api/users/" + user.getId() + "/avatar?v="
            + avatar.getUpdatedAt().toInstant(java.time.ZoneOffset.UTC).toEpochMilli());
        return mapToDto(userRepository.save(user));
    }

    /** Removes the profile picture. */
    @Transactional
    public UserDto clearAvatar(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        userAvatarRepository.deleteByUserId(user.getId());
        user.setProfileImageUrl(null);
        return mapToDto(userRepository.save(user));
    }

    /** The raw picture bytes for the public serving endpoint. */
    @Transactional(readOnly = true)
    public UserAvatar getAvatar(Long userId) {
        return userAvatarRepository.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException("Avatar", "userId", userId));
    }

    @Transactional(readOnly = true)
    public UserDto getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return mapToDto(user);
    }

    @Transactional(readOnly = true)
    public Page<UserDto> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::mapToDto);
    }

    @Transactional
    public UserDto updateUser(String email, UpdateUserRequest request) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getProfileImageUrl() != null) {
            user.setProfileImageUrl(sanitizeProfileImageUrl(request.getProfileImageUrl()));
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }
        if (request.getTimezone() != null) {
            if (!TimezoneUtils.isValidTimezone(request.getTimezone())) {
                throw new BadRequestException("Invalid timezone: " + request.getTimezone());
            }
            user.setTimezone(request.getTimezone());
        }

        User saved = userRepository.save(user);
        return mapToDto(saved);
    }

    private UserDto mapToDto(User user) {
        return UserDto.builder()
            .id(user.getId())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .phone(user.getPhone())
            .role(user.getRole())
            .profileImageUrl(user.getProfileImageUrl())
            .bio(user.getBio())
            .timezone(user.getTimezone())
            .active(user.isActive())
            .createdAt(user.getCreatedAt())
            .build();
    }

    /**
     * Profile picture URLs are rendered in <img> tags across the app — only
     * same-site relative paths or HTTPS images are accepted, blocking
     * javascript:/data: injection through the profile update endpoint.
     */
    private String sanitizeProfileImageUrl(String url) {
        String trimmed = url.trim();
        boolean allowed = trimmed.startsWith("/") && !trimmed.startsWith("//")
            || trimmed.toLowerCase().startsWith("https://");
        if (!allowed) {
            throw new BadRequestException("Profile picture URL must be a same-site path or an https:// image.");
        }
        return trimmed;
    }
}
