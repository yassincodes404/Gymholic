package com.gymholic.payment;

import com.gymholic.booking.BookingRepository;
import com.gymholic.booking.BookingService;
import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.BookingStatus;
import com.gymholic.common.enums.PaymentStatus;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.payment.dto.CreatePaymentRequest;
import com.gymholic.payment.dto.PaymentDto;
import com.gymholic.payment.entity.Payment;
import com.gymholic.notification.NotificationService;
import com.gymholic.payment.provider.PaymentProvider;
import com.gymholic.payment.provider.PaymentProviderConfigService;
import com.gymholic.settings.SettingsService;
import com.gymholic.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private BookingService bookingService;

    @Mock
    private PaymentProvider paymobProvider;

    @Mock
    private PaymentProvider mockProvider;

    @Mock
    private NotificationService notificationService;

    @Mock
    private SettingsService settingsService;

    @Mock
    private com.gymholic.order.OrderService orderService;

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        lenient().when(paymobProvider.getProviderName()).thenReturn("paymob");
        lenient().when(mockProvider.getProviderName()).thenReturn("mock");
        paymentService = new PaymentService(
            paymentRepository,
            bookingRepository,
            bookingService,
            orderService,
            notificationService,
            List.of(paymobProvider, mockProvider),
            mock(PaymentProviderConfigService.class),
            settingsService);
    }

    private User client() {
        User client = new User();
        client.setId(1L);
        client.setEmail("test@example.com");
        client.setFirstName("Test");
        return client;
    }

    private Booking pendingBooking() {
        Booking booking = new Booking();
        booking.setId(1L);
        booking.setClient(client());
        booking.setStatus(BookingStatus.PENDING);
        return booking;
    }

    private Payment pendingPaymobPayment(Booking booking, String orderId) {
        Payment payment = new Payment();
        payment.setId(10L);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setBooking(booking);
        payment.setProviderName("paymob");
        payment.setProviderTransactionId(orderId);
        payment.setAmount(new BigDecimal("500.00"));
        payment.setCurrency("AED");
        return payment;
    }

    private Payment pendingMockPayment(Booking booking) {
        Payment payment = new Payment();
        payment.setId(11L);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setBooking(booking);
        payment.setProviderName("mock");
        payment.setProviderTransactionId("order-mock");
        payment.setAmount(new BigDecimal("150.00"));
        payment.setCurrency("USD");
        payment.setProviderCheckoutUrl("https://checkout.example/mock");
        return payment;
    }

    @Test
    void handlePaymobWebhook_SuccessAndNotPending_CompletesPaymentAndConfirmsBooking() {
        String payload = "{}";
        String hmac = "valid_hmac";
        String orderId = "12345";

        Booking booking = pendingBooking();
        Payment payment = pendingPaymobPayment(booking, orderId);

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

    @Test
    void handlePaymobWebhook_BookingNoLongerPending_PaymentStaysCompletedAndAdminNotified() {
        String payload = "{}";
        String hmac = "valid_hmac";
        String orderId = "12345";

        User trainer = new User();
        trainer.setId(2L);
        trainer.setEmail("trainer@example.com");

        Booking booking = pendingBooking();
        booking.setTrainer(trainer);
        booking.setStatus(BookingStatus.CANCELLED);
        Payment payment = pendingPaymobPayment(booking, orderId);

        when(paymobProvider.verifyWebhook(payload, hmac)).thenReturn(Map.of(
            "orderId", orderId,
            "success", true,
            "pending", false
        ));
        when(paymentRepository.findByProviderTransactionId(orderId)).thenReturn(Optional.of(payment));
        doThrow(new BadRequestException("Only pending bookings can be confirmed"))
            .when(bookingService).confirmBooking(1L);
        when(settingsService.getString("ADMIN_NOTIFY_EMAIL", "trainer@example.com"))
            .thenReturn("trainer@example.com");

        // Must not propagate — the captured payment is already persisted as
        // COMPLETED, so Paymob gets its ACK and stops retrying.
        paymentService.handlePaymobWebhook(payload, hmac);

        verify(paymentRepository, times(1)).save(argThat(p -> p.getStatus() == PaymentStatus.COMPLETED));
        verify(notificationService, times(1)).sendAdminPaymentReviewNeeded(
            eq("trainer@example.com"),
            anyString(),
            eq("test@example.com"),
            eq(1L),
            eq("CANCELLED"),
            eq("500.00"),
            eq("AED"),
            eq(orderId));
    }

    @Test
    void createPayment_ExistingPendingPayment_IsReused() {
        Booking booking = pendingBooking();
        Payment existing = pendingMockPayment(booking);
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(paymentRepository.findByBookingId(1L)).thenReturn(List.of(existing));

        PaymentDto result = paymentService.createPayment(CreatePaymentRequest.builder()
            .bookingId(1L)
            .amount(new BigDecimal("150.00"))
            .provider("mock")
            .build());

        assertEquals(existing.getId(), result.getId());
        verify(mockProvider, never()).createCheckout(any(), anyString(), anyString(), any());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void createPayment_AlreadyCompletedPayment_Rejected() {
        Booking booking = pendingBooking();
        Payment paid = pendingMockPayment(booking);
        paid.setStatus(PaymentStatus.COMPLETED);
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(paymentRepository.findByBookingId(1L)).thenReturn(List.of(paid));

        assertThrows(BadRequestException.class, () -> paymentService.createPayment(
            CreatePaymentRequest.builder()
                .bookingId(1L)
                .amount(new BigDecimal("150.00"))
                .provider("mock")
                .build()));
    }
}
