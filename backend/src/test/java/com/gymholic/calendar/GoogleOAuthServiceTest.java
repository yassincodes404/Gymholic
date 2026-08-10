package com.gymholic.calendar;

import com.gymholic.calendar.entity.GoogleConnection;
import com.gymholic.calendar.repository.GoogleConnectionRepository;
import com.gymholic.calendar.util.EncryptionUtil;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GoogleOAuthServiceTest {

    @Mock
    private GoogleConnectionRepository connectionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EncryptionUtil encryptionUtil;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private GoogleOAuthService googleOAuthService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(googleOAuthService, "clientId", "test-client-id");
        ReflectionTestUtils.setField(googleOAuthService, "clientSecret", "test-client-secret");
        ReflectionTestUtils.setField(googleOAuthService, "redirectUri", "http://localhost:8080/callback");
    }

    @Test
    void getAuthorizationUrl_ShouldGenerateStateAndStoreInRedis() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        
        Long userId = 1L;
        String authUrl = googleOAuthService.getAuthorizationUrl(userId);

        assertNotNull(authUrl);
        assertTrue(authUrl.contains("state="));
        verify(valueOperations, times(1)).set(startsWith("oauth_state:"), eq(userId.toString()), eq(10L), eq(TimeUnit.MINUTES));
    }

    @Test
    void exchangeCodeForToken_WithInvalidState_ShouldThrowException() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("oauth_state:invalid_state")).thenReturn(null);

        RuntimeException exception = assertThrows(RuntimeException.class, () -> 
            googleOAuthService.exchangeCodeForToken("some_code", "invalid_state")
        );

        assertEquals("Invalid or expired authorization session. Please try connecting again.", exception.getMessage());
        verify(redisTemplate, never()).delete(anyString());
    }

    @Test
    void exchangeCodeForToken_WithValidState_ShouldDeleteState() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("oauth_state:valid_state")).thenReturn("1");
        
        // This will throw exception because token exchange itself isn't fully mocked for Google's API,
        // but we can verify the state deletion logic happens first.
        assertThrows(RuntimeException.class, () -> 
            googleOAuthService.exchangeCodeForToken("some_code", "valid_state")
        );

        verify(redisTemplate, times(1)).delete("oauth_state:valid_state");
    }
}