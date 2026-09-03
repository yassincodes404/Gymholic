package com.gymholic.auth;

import com.gymholic.common.exception.BadRequestException;
import com.gymholic.notification.BrevoSmsService;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * The phone verification flow: a code is texted to the NEW number, the
 * account is untouched until the code checks out, wrong attempts are
 * counted, identical re-sends are throttled and a number change retires the
 * previous challenge.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PhoneVerificationServiceTest {

    @Mock
    private PhoneVerificationCodeRepository codeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private BrevoSmsService smsService;

    @InjectMocks
    private PhoneVerificationService service;

    private User user;
    private PhoneVerificationCode savedCode;

    @BeforeEach
    void setUp() {
        user = User.builder()
            .id(1L)
            .email("client@example.com")
            .firstName("Yassin")
            .phone(null)
            .phoneVerified(false)
            .build();
        savedCode = PhoneVerificationCode.builder()
            .id(9L)
            .user(user)
            .phone("+201098765432")
            .codeHash("hash")
            .expiresAt(Instant.now().plusSeconds(600))
            .createdAt(Instant.now())
            .build();

        when(userRepository.findByEmail("client@example.com")).thenReturn(Optional.of(user));
        when(userRepository.existsByPhoneAndIdNot(anyString(), anyLong())).thenReturn(false);
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(codeRepository.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(1L))
            .thenReturn(Optional.empty());
        when(codeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(smsService.isSmsActive()).thenReturn(true);
        when(smsService.sendSmsNow(anyString(), anyString())).thenReturn(null);
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
    }

    /** Pulls the persisted challenge (what confirm() will load) and the code texted out. */
    private PhoneVerificationCode persistedChallenge() {
        ArgumentCaptor<PhoneVerificationCode> saved = ArgumentCaptor.forClass(PhoneVerificationCode.class);
        verify(codeRepository).save(saved.capture());
        return saved.getValue();
    }

    private String capturedCode() {
        ArgumentCaptor<String> text = ArgumentCaptor.forClass(String.class);
        verify(smsService).sendSmsNow(eq("+201098765432"), text.capture());
        return text.getValue().replaceAll("[^0-9]", "").substring(0, 6);
    }

    @Test
    void requestSendsCodeToNormalizedNumberWithoutTouchingTheAccount() {
        String masked = service.requestPhoneChange("client@example.com", "+20 (109) 876-5432");

        assertEquals("+20109876 •••• 5432", masked);
        verify(smsService).sendSmsNow(eq("+201098765432"), contains("Gymholic: your verification code is"));
        // Nothing landed on the account yet.
        assertNull(user.getPhone());
        assertFalse(user.isPhoneVerified());
    }

    @Test
    void confirmAppliesNumberAndVerifiedFlag() {
        service.requestPhoneChange("client@example.com", "+201098765432");
        String code = capturedCode();
        PhoneVerificationCode challenge = persistedChallenge();
        when(codeRepository.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(1L))
            .thenReturn(Optional.of(challenge));
        when(passwordEncoder.matches(eq(code), anyString())).thenReturn(true);

        User saved = service.confirmPhoneChange("client@example.com", code);

        assertEquals("+201098765432", saved.getPhone());
        assertTrue(saved.isPhoneVerified());
    }

    @Test
    void confirmRejectsWrongCodeAndCountsTheAttempt() {
        service.requestPhoneChange("client@example.com", "+201098765432");
        String code = capturedCode();
        PhoneVerificationCode challenge = persistedChallenge();
        when(codeRepository.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(1L))
            .thenReturn(Optional.of(challenge));

        assertThrows(BadRequestException.class,
            () -> service.confirmPhoneChange("client@example.com", "000000"));

        assertEquals(1, challenge.getAttempts());
        // Account still untouched after a wrong guess.
        assertNull(user.getPhone());
        assertFalse(user.isPhoneVerified());
    }

    @Test
    void confirmRejectsSixDigitGarbageWithoutSpendingAnAttempt() {
        assertThrows(BadRequestException.class,
            () -> service.confirmPhoneChange("client@example.com", "12ab78"));
        verify(codeRepository, never()).save(any());
    }

    @Test
    void requestRejectsImplausibleNumbers() {
        assertThrows(BadRequestException.class,
            () -> service.requestPhoneChange("client@example.com", "call me maybe"));
        verify(smsService, never()).sendSmsNow(anyString(), anyString());
    }

    @Test
    void requestRejectsNumbersOwnedByAnotherAccount() {
        when(userRepository.existsByPhoneAndIdNot(eq("+201098765432"), eq(1L))).thenReturn(true);

        assertThrows(BadRequestException.class,
            () -> service.requestPhoneChange("client@example.com", "+201098765432"));
        verify(smsService, never()).sendSmsNow(anyString(), anyString());
    }

    @Test
    void requestFailsWhenSmsIsNotConfigured() {
        when(smsService.isSmsActive()).thenReturn(false);

        assertThrows(BadRequestException.class,
            () -> service.requestPhoneChange("client@example.com", "+201098765432"));
        verify(smsService, never()).sendSmsNow(anyString(), anyString());
    }

    @Test
    void identicalResendInsideTheThrottleWindowIsSuppressed() {
        when(codeRepository.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(1L))
            .thenReturn(Optional.of(savedCode));

        service.requestPhoneChange("client@example.com", "+20 109 876 5432");

        verify(smsService, never()).sendSmsNow(anyString(), anyString());
    }

    @Test
    void changingTheNumberRetiresThePreviousChallenge() {
        when(codeRepository.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(1L))
            .thenReturn(Optional.of(savedCode));

        service.requestPhoneChange("client@example.com", "+31123456789");

        verify(codeRepository).consumeAllByUserId(eq(1L), any(Instant.class));
        verify(smsService).sendSmsNow(eq("+31123456789"), anyString());
    }

    @Test
    void anExpiredChallengeIsReplacedImmediately() {
        savedCode.setExpiresAt(Instant.now().minusSeconds(1));
        when(codeRepository.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(1L))
            .thenReturn(Optional.of(savedCode));

        service.requestPhoneChange("client@example.com", "+201098765432");

        verify(smsService).sendSmsNow(eq("+201098765432"), anyString());
    }

    // ---- mandatory-verification gate ----

    private void setRequired(boolean required) {
        org.springframework.test.util.ReflectionTestUtils.setField(service, "phoneVerificationRequired", required);
    }

    @Test
    void gateBlocksUnverifiedAccountWhenRequired() {
        setRequired(true);
        when(smsService.isSmsActive()).thenReturn(true);

        assertThrows(BadRequestException.class, () -> service.requireVerifiedPhone(user));
        assertThrows(BadRequestException.class,
            () -> service.requireVerifiedPhone(User.builder().id(2L).phone("+20111111111").phoneVerified(false).build()));
    }

    @Test
    void gateLetsVerifiedAccountsThrough() {
        setRequired(true);
        user.setPhoneVerified(true);

        assertDoesNotThrow(() -> service.requireVerifiedPhone(user));
    }

    @Test
    void gateIsInertWhenPolicyDisabled() {
        setRequired(false);

        assertDoesNotThrow(() -> service.requireVerifiedPhone(user));
    }
}
