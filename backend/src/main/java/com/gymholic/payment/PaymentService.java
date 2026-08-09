package com.gymholic.payment;

import com.gymholic.booking.BookingRepository;
import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.PaymentStatus;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.payment.dto.CreatePaymentRequest;
import com.gymholic.payment.dto.PaymentDto;
import com.gymholic.payment.entity.Payment;
import com.gymholic.payment.provider.PaymentProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final List<PaymentProvider> paymentProviders;

    @Transactional
    public PaymentDto createPayment(CreatePaymentRequest request) {
        Booking booking = bookingRepository.findById(request.getBookingId())
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", request.getBookingId()));

        PaymentProvider provider = paymentProviders.stream()
            .filter(p -> p.getProviderName().equals(request.getProvider()))
            .findFirst()
            .orElseThrow(() -> new BadRequestException("Unknown payment provider: " + request.getProvider()));

        Map<String, String> checkout = provider.createCheckout(
            request.getAmount(),
            request.getCurrency(),
            "Booking #" + booking.getId(),
            Map.of("bookingId", booking.getId().toString()));

        Payment payment = Payment.builder()
            .booking(booking)
            .amount(request.getAmount())
            .currency(request.getCurrency())
            .status(PaymentStatus.PENDING)
            .providerName(provider.getProviderName())
            .providerTransactionId(checkout.get("transactionId"))
            .providerCheckoutUrl(checkout.get("checkoutUrl"))
            .build();

        Payment saved = paymentRepository.save(payment);
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
