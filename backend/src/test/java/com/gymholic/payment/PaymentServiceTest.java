package com.gymholic.payment;

import com.gymholic.booking.BookingService;
import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.PaymentStatus;
import com.gymholic.payment.entity.Payment;
import com.gymholic.notification.NotificationService;
import com.gymholic.payment.provider.PaymentProvider;
import com.gymholic.payment.provider.PaymentProviderConfigService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import com.gymholic.user.entity.User;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private BookingService bookingService;

    @Mock
    private PaymentProvider paymobProvider;

    @Mock
    private NotificationService notificationService;

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        when(paymobProvider.getProviderName()).thenReturn("paymob");
        paymentService = new PaymentService(
            paymentRepository,
            null,
            bookingService,
            notificationService,
            List.of(paymobProvider),
            mock(PaymentProviderConfigService.class));
    }

    @Test
    void handlePaymobWebhook_SuccessAndNotPending_CompletesPaymentAndConfirmsBooking() {
        String payload = "{}";
        String hmac = "valid_hmac";
        String orderId = "12345";

        User client = new User();
        client.setEmail("test@example.com");
        client.setFirstName("Test");

        Booking booking = new Booking();
        booking.setId(1L);
        booking.setClient(client);

        Payment payment = new Payment();
        payment.setId(1L);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setBooking(booking);
        payment.setProviderTransactionId(orderId);
        payment.setAmount(new BigDecimal("500.00"));
        payment.setCurrency("AED");

        when(paymobProvider.verifyWebhook(payload, hmac)).thenReturn(Map.of(
            "orderId", orderId,
            "success", true,
            "pending", false
        ));

        when(paymentRepository.findByProviderTransactionId(orderId)).thenReturn(Optional.of(payment));

        paymentService.handlePaymobWebhook(payload, hmac);

        verify(paymentRepository, times(1)).save(argThat(p -> p.getStatus() == PaymentStatus.COMPLETED));
        verify(bookingService, times(1)).confirmBooking(1L);
    }

    @Test
    void handlePaymobWebhook_AlreadyCompleted_IsIdempotent() {
        String payload = "{}";
        String hmac = "valid_hmac";
        String orderId = "12345";

        Payment payment = new Payment();
        payment.setId(1L);
        payment.setStatus(PaymentStatus.COMPLETED);

        when(paymobProvider.verifyWebhook(payload, hmac)).thenReturn(Map.of(
            "orderId", orderId,
            "success", true,
            "pending", false
        ));

        when(paymentRepository.findByProviderTransactionId(orderId)).thenReturn(Optional.of(payment));

        paymentService.handlePaymobWebhook(payload, hmac);

        verify(paymentRepository, never()).save(any());
        verify(bookingService, never()).confirmBooking(any());
    }

    @Test
    void handlePaymobWebhook_FailedPayment_SetsStatusToFailed() {
        String payload = "{}";
        String hmac = "valid_hmac";
        String orderId = "12345";

        Payment payment = new Payment();
        payment.setId(1L);
        payment.setStatus(PaymentStatus.PENDING);

        when(paymobProvider.verifyWebhook(payload, hmac)).thenReturn(Map.of(
            "orderId", orderId,
            "success", false,
            "pending", false
        ));

        when(paymentRepository.findByProviderTransactionId(orderId)).thenReturn(Optional.of(payment));

        paymentService.handlePaymobWebhook(payload, hmac);

        verify(paymentRepository, times(1)).save(argThat(p -> p.getStatus() == PaymentStatus.FAILED));
        verify(bookingService, never()).confirmBooking(any());
    }
}
