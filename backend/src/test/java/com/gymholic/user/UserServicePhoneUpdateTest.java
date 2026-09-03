package com.gymholic.user;

import com.gymholic.common.exception.BadRequestException;
import com.gymholic.user.dto.UpdateUserRequest;
import com.gymholic.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * The generic profile update is NOT a phone-change back door: the number can
 * only be set (or replaced) through SMS verification — a profile save may
 * keep the verified number or clear it, nothing else.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserServicePhoneUpdateTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserAvatarRepository userAvatarRepository;

    @Mock
    private com.gymholic.auth.PhoneVerificationService phoneVerificationService;

    @InjectMocks
    private UserService userService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
            .id(1L)
            .email("client@example.com")
            .firstName("Yassin")
            .phone("+201098765432")
            .phoneVerified(true)
            .build();
        when(userRepository.findByEmail("client@example.com")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
    }

    @Test
    void aDifferentNumberIsRejected() {
        UpdateUserRequest request = UpdateUserRequest.builder().phone("+20111111111").build();

        assertThrows(BadRequestException.class,
            () -> userService.updateUser("client@example.com", request));

        // Nothing moved.
        assertEquals("+201098765432", user.getPhone());
        assertTrue(user.isPhoneVerified());
    }

    @Test
    void garbageIsRejected() {
        UpdateUserRequest request = UpdateUserRequest.builder().phone("not-a-phone").build();

        assertThrows(BadRequestException.class,
            () -> userService.updateUser("client@example.com", request));
        assertEquals("+201098765432", user.getPhone());
    }

    @Test
    void theSameNumberReformattedIsANoOp() {
        UpdateUserRequest request = UpdateUserRequest.builder().phone("+20 109 876 5432").build();

        userService.updateUser("client@example.com", request);

        assertEquals("+201098765432", user.getPhone());
        assertTrue(user.isPhoneVerified());
    }

    @Test
    void clearingTheNumberDropsVerification() {
        UpdateUserRequest request = UpdateUserRequest.builder().phone(" ").build();

        userService.updateUser("client@example.com", request);

        assertNull(user.getPhone());
        assertFalse(user.isPhoneVerified());
    }
}
