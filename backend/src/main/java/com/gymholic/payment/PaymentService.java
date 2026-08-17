package com.gymholic.payment;

import com.gymholic.booking.BookingRepository;
import com.gymholic.booking.BookingService;
import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.PaymentStatus;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.payment.dto.CreatePaymentRequest;
import com.gymholic.payment.dto.PaymentDto;
import com.gymholic.payment.dto.PaymentHistoryDto;
import com.gymholic.payment.entity.Payment;
import com.gymholic.payment.provider.PaymentProvider;
import com.gymholic.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final NotificationService notificationService;
    private final List<PaymentProvider> paymentProviders;
    private final com.gymholic.payment.provider.PaymentProviderConfigService providerConfigService;

    @Transactional
    public PaymentDto createPayment(CreatePaymentRequest request) {
        Booking booking = bookingRepository.findById(request.getBookingId())
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", request.getBookingId()));

        PaymentProvider provider = paymentProviders.stream()
            .filter(p -> p.getProviderName().equals(request.getProvider()))
            .findFirst()
            .orElseThrow(() -> new BadRequestException("Unknown payment provider: " + request.getProvider()));

        if ("paymob".equals(request.getProvider()) && !providerConfigService.isPaymobActive()) {
            throw new BadRequestException(
                "Paymob is not enabled. Configure and enable it under Admin → Integrations.");
        }

        // The amount is resolved server-side from the admin-managed settings,
        // so a tampered client request can never choose its own price.
        String[] resolved = bookingService.resolveBookingPrice(booking.getNotes());
        BigDecimal amount = new BigDecimal(resolved[0]);
        String currency = resolved[1];
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException(
                "This service is currently priced at zero in the admin settings, so checkout cannot start. Please contact support.");
        }

        Map<String, String> checkout = provider.createCheckout(
            amount,
            currency,
            "Booking #" + booking.getId(),
            Map.of("bookingId", booking.getId().toString()));

        Payment payment = Payment.builder()
            .booking(booking)
            .amount(amount)
            .currency(currency)
            .status(PaymentStatus.PENDING)
            .providerName(provider.getProviderName())
            .providerTransactionId(checkout.get("transactionId"))
            .providerCheckoutUrl(checkout.get("checkoutUrl"))
            .build();

        Payment saved = paymentRepository.save(payment);

        notificationService.sendBookingCreated(
            booking.getClient().getEmail(),
            booking.getClient().getFirstName(),
            booking.getTrainer().getFirstName(),
            booking.getStartTime().toString(),
            saved.getProviderCheckoutUrl()
        );

        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public PaymentDto getPaymentById(Long id) {
        Payment payment = paymentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Payment", "id", id));
        return mapToDto(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentDto> getPaymentsByBooking(Long bookingId) {
        return paymentRepository.findByBookingId(bookingId)
            .stream()
            .map(this::mapToDto)
            .toList();
    }

    @Transactional
    public void handlePaymobWebhook(String payload, String hmac) {
        PaymentProvider provider = paymentProviders.stream()
            .filter(p -> p.getProviderName().equals("paymob"))
            .findFirst()
            .orElseThrow(() -> new BadRequestException("Paymob provider not found"));

        Map<String, Object> result = provider.verifyWebhook(payload, hmac);
        
        String orderId = (String) result.get("orderId");
        boolean success = (Boolean) result.get("success");
        boolean pending = (Boolean) result.get("pending");

        Payment payment = paymentRepository.findByProviderTransactionId(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Payment", "orderId", orderId));

        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            // Idempotency: Ignore if already completed
            return;
        }

        if (success && !pending) {
            payment.setStatus(PaymentStatus.COMPLETED);
            paymentRepository.save(payment);
            
            notificationService.sendPaymentSuccessful(
                payment.getBooking().getClient().getEmail(),
                payment.getBooking().getClient().getFirstName(),
                payment.getAmount().toString(),
                payment.getCurrency(),
                orderId
            );

            // Confirm booking
            bookingService.confirmBooking(payment.getBooking().getId());
        } else if (!pending) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
        }
    }

    /**
     * Dev/test-only path: marks a mock payment as COMPLETED and runs the same
     * downstream chain as a successful real webhook (payment email + booking
     * confirmation -> Google Calendar event, Meet link, confirmation email).
     */
    @Transactional
    public PaymentDto completeMockPayment(Long paymentId, String currentUserEmail, boolean isAdmin) {
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new ResourceNotFoundException("Payment", "id", paymentId));

        Booking booking = payment.getBooking();
        if (!isAdmin && !booking.getClient().getEmail().equalsIgnoreCase(currentUserEmail)) {
            throw new BadRequestException("You can only complete payments for your own bookings.");
        }
        if (!"mock".equals(payment.getProviderName())) {
            throw new BadRequestException("Only mock payments can be completed via the test endpoint.");
        }
        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            // Idempotency: ignore if already completed
            return mapToDto(payment);
        }

        payment.setStatus(PaymentStatus.COMPLETED);
        paymentRepository.save(payment);

        notificationService.sendPaymentSuccessful(
            booking.getClient().getEmail(),
            booking.getClient().getFirstName(),
            payment.getAmount().toString(),
            payment.getCurrency(),
            payment.getProviderTransactionId()
        );

        bookingService.confirmBooking(booking.getId());
        return mapToDto(payment);
    }


    @Transactional(readOnly = true)
    public List<PaymentHistoryDto> getMyPayments(Long userId) {
        return paymentRepository.findByBookingClientId(userId).stream()
            .map(p -> PaymentHistoryDto.builder()
                .id(p.getId())
                .bookingId(p.getBooking().getId())
                .amount(p.getAmount())
                .currency(p.getCurrency())
                .status(p.getStatus().name())
                .providerName(p.getProviderName())
                .description("Consultation booking #" + p.getBooking().getId())
                .bookingStartTime(p.getBooking().getStartTime())
                .createdAt(p.getCreatedAt())
                .build())
            .toList();
    }

    private PaymentDto mapToDto(Payment payment) {
        return PaymentDto.builder()
            .id(payment.getId())
            .bookingId(payment.getBooking().getId())
            .amount(payment.getAmount())
            .currency(payment.getCurrency())
            .status(payment.getStatus())
            .providerName(payment.getProviderName())
            .checkoutUrl(payment.getProviderCheckoutUrl())
            .createdAt(payment.getCreatedAt())
            .build();
    }
}
