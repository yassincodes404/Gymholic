package com.gymholic.account;

import com.gymholic.account.dto.PurchaseHistoryDto;
import com.gymholic.booking.BookingRepository;
import com.gymholic.booking.entity.Booking;
import com.gymholic.order.OrderItemRepository;
import com.gymholic.order.OrderRepository;
import com.gymholic.order.entity.Order;
import com.gymholic.order.entity.OrderItem;
import com.gymholic.payment.PaymentRepository;
import com.gymholic.payment.entity.Payment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Unified client purchase history: paid consultations, free open
 * consultations and product orders (blueprints, Academy membership, future
 * courses) — newest first.
 */
@Service
@RequiredArgsConstructor
public class AccountHistoryService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;

    @Transactional(readOnly = true)
    public List<PurchaseHistoryDto> getHistory(Long userId) {
        List<PurchaseHistoryDto> rows = new ArrayList<>();

        // Paid consultations
        List<Payment> payments = paymentRepository.findByBookingClientId(userId);
        Set<Long> paidBookingIds = payments.stream()
            .map(p -> p.getBooking().getId())
            .collect(Collectors.toSet());

        for (Payment payment : payments) {
            rows.add(PurchaseHistoryDto.builder()
                .key("payment-" + payment.getId())
                .kind("CONSULTATION_PAYMENT")
                .refId(payment.getId())
                .title(serviceTitle(payment.getBooking().getNotes(), "Consultation booking #" + payment.getBooking().getId()))
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .status(payment.getStatus().name())
                .providerName(payment.getProviderName())
                .occurredAt(payment.getCreatedAt())
                .build());
        }

        // Free open consultations (bookings with no payment record at all)
        for (Booking booking : bookingRepository.findByClientIdOrderByCreatedAtDesc(userId)) {
            if (paidBookingIds.contains(booking.getId())) {
                continue;
            }
            rows.add(PurchaseHistoryDto.builder()
                .key("booking-" + booking.getId())
                .kind("FREE_CONSULTATION")
                .refId(booking.getId())
                .title(serviceTitle(booking.getNotes(), "Free Open Consultation"))
                .amount(BigDecimal.ZERO)
                .currency("USD")
                .status(booking.getStatus().name())
                .providerName("—")
                .occurredAt(booking.getCreatedAt())
                .build());
        }

        // Product orders (blueprints, Academy membership, future courses/PDFs)
        for (Order order : orderRepository.findByUserIdOrderByCreatedAtDesc(userId)) {
            List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
            String title = items.isEmpty()
                ? "Order #" + order.getId()
                : items.stream().map(OrderItem::getTitle).collect(Collectors.joining(", "));
            rows.add(PurchaseHistoryDto.builder()
                .key("order-" + order.getId())
                .kind("ORDER")
                .refId(order.getId())
                .title(title)
                .amount(order.getTotal())
                .currency(order.getCurrency())
                .status(order.getStatus().name())
                .providerName(order.getProviderName())
                .occurredAt(order.getCreatedAt())
                .build());
        }

        rows.sort((a, b) -> b.getOccurredAt().compareTo(a.getOccurredAt()));
        return rows;
    }

    /** Booking notes start with "Service: <name>" — use it as the row title. */
    private String serviceTitle(String notes, String fallback) {
        if (notes == null) return fallback;
        for (String line : notes.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.startsWith("Service:")) {
                String title = trimmed.substring("Service:".length()).trim();
                if (!title.isBlank()) return title;
            }
        }
        return fallback;
    }
}
