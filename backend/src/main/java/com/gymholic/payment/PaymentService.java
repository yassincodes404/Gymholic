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
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final com.gymholic.order.OrderService orderService;
    private final NotificationService notificationService;
    private final List<PaymentProvider> paymentProviders;
    private final com.gymholic.payment.provider.PaymentProviderConfigService providerConfigService;
    private final com.gymholic.settings.SettingsService settingsService;

    @Transactional
    public PaymentDto createPayment(CreatePaymentRequest request) {
        if (request.getBookingId() == null && request.getOrderId() == null) {
            throw new BadRequestException("A bookingId or orderId is required to start a payment.");
        }
        if (request.getBookingId() != null && request.getOrderId() != null) {
            throw new BadRequestException("A payment targets either a booking or an order, not both.");
        }
        return request.getOrderId() != null
            ? createOrderPayment(request)
            : createBookingPayment(request);
    }

    /** Store orders (blueprints / Academy membership): amount from the order. */
    private PaymentDto createOrderPayment(CreatePaymentRequest request) {
        com.gymholic.order.entity.Order order = orderService.getOrderForPayment(request.getOrderId());

        PaymentProvider provider = resolveProvider(request.getProvider());

        // One payment attempt per order: completed means paid; a pending one
        // on the same provider is reused instead of stacking retries.
        List<Payment> existing = paymentRepository.findByOrderId(order.getId());
        if (existing.stream().anyMatch(p -> p.getStatus() == PaymentStatus.COMPLETED)) {
            throw new BadRequestException("This order is already paid.");
        }
        Optional<Payment> pendingSameProvider = existing.stream()
            .filter(p -> p.getStatus() == PaymentStatus.PENDING
                      && provider.getProviderName().equals(p.getProviderName()))
            .findFirst();
        if (pendingSameProvider.isPresent()) {
            return mapToDto(pendingSameProvider.get());
        }

        if (order.getTotal().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException(
                "This order totals zero, so checkout cannot start. Please contact support.");
        }

        var user = order.getUser();
        Map<String, String> checkout = provider.createCheckout(
            order.getTotal(),
            order.getCurrency(),
            "Gymholic order #" + order.getId(),
            Map.of(
                "clientEmail", user.getEmail(),
                "clientFirstName", nullSafe(user.getFirstName(), "Gymholic"),
                "clientLastName", nullSafe(user.getLastName(), "Customer"),
                "clientPhone", nullSafe(user.getPhone(), "+201000000000")));

        Payment saved = paymentRepository.save(Payment.builder()
            .order(order)
            .amount(order.getTotal())
            .currency(order.getCurrency())
            .status(PaymentStatus.PENDING)
            .providerName(provider.getProviderName())
            .providerTransactionId(checkout.get("transactionId"))
            .providerCheckoutUrl(checkout.get("checkoutUrl"))
            .build());
        return mapToDto(saved);
    }

    private PaymentProvider resolveProvider(String name) {
        // Only implemented providers are selectable — "stripe" is a stub and
        // would 500 mid-checkout.
        if ("stripe".equalsIgnoreCase(name)) {
            throw new BadRequestException("Stripe is not available yet — use Paymob.");
        }
        PaymentProvider provider = paymentProviders.stream()
            .filter(p -> p.getProviderName().equals(name))
            .findFirst()
            .orElseThrow(() -> new BadRequestException("Unknown payment provider: " + name));
        if ("paymob".equals(name) && !providerConfigService.isPaymobActive()) {
            throw new BadRequestException(
                "Paymob is not enabled. Configure and enable it under Admin → Integrations.");
        }
        return provider;
    }

    /** Consultation bookings: amount resolved from admin-managed settings. */
    private PaymentDto createBookingPayment(CreatePaymentRequest request) {
        Booking booking = bookingRepository.findById(request.getBookingId())
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", request.getBookingId()));

        PaymentProvider provider = resolveProvider(request.getProvider());

        // One payment attempt per booking: a completed payment means the
        // booking is paid; a still-pending one is reused instead of piling
        // up duplicate rows on every checkout retry.
        List<Payment> existingPayments = paymentRepository.findByBookingId(booking.getId());
        if (existingPayments.stream().anyMatch(p -> p.getStatus() == PaymentStatus.COMPLETED)) {
            throw new BadRequestException("This booking is already paid.");
        }
        Optional<Payment> pendingSameProvider = existingPayments.stream()
            .filter(p -> p.getStatus() == PaymentStatus.PENDING
                      && provider.getProviderName().equals(p.getProviderName()))
            .findFirst();
        if (pendingSameProvider.isPresent()) {
            return mapToDto(pendingSameProvider.get());
        }

        // The amount is resolved server-side from the admin-managed settings,
        // so a tampered client request can never choose its own price.
        String[] resolved = bookingService.resolveBookingPrice(booking);
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
            Map.of(
                "bookingId", booking.getId().toString(),
                "clientEmail", booking.getClient().getEmail(),
                "clientFirstName", nullSafe(booking.getClient().getFirstName(), "Gymholic"),
                "clientLastName", nullSafe(booking.getClient().getLastName(), "Customer"),
                "clientPhone", nullSafe(booking.getClient().getPhone(), "+201000000000")));

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
            clientDisplayTime(booking),
            saved.getProviderCheckoutUrl()
        );

        return mapToDto(saved);
    }

    /** The booking time in the client's timezone — raw ISO stamps never belong in a client email. */
    private String clientDisplayTime(Booking booking) {
        try {
            return com.gymholic.common.util.DateTimeUtils.formatForDisplay(
                booking.getStartTime(), java.time.ZoneId.of(booking.getClientTimezone()));
        } catch (Exception e) {
            return com.gymholic.common.util.DateTimeUtils.formatForDisplay(booking.getStartTime());
        }
    }

    private static String nullSafe(String value, String fallback) {
        return value != null && !value.isBlank() ? value : fallback;
    }

    @Transactional(readOnly = true)
    public PaymentDto getPaymentById(Long id) {
        Payment payment = paymentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Payment", "id", id));
        assertCanView(payment);
        return mapToDto(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentDto> getPaymentsByBooking(Long bookingId) {
        List<PaymentDto> payments = paymentRepository.findByBookingId(bookingId)
            .stream()
            .map(this::mapToDto)
            .toList();
        if (!payments.isEmpty()) {
            // Ownership gate: the caller must own the booking (or be admin).
            assertCanView(paymentRepository.findByBookingId(bookingId).get(0));
        }
        return payments;
    }

    /** A payment is visible to its owner (booking client or order buyer) and to admins — nobody else. */
    private void assertCanView(Payment payment) {
        if (com.gymholic.security.SecurityUtils.hasRole("ADMIN")) {
            return;
        }
        String caller = com.gymholic.security.SecurityUtils.getCurrentUserEmail();
        String owner = null;
        if (payment.getBooking() != null && payment.getBooking().getClient() != null) {
            owner = payment.getBooking().getClient().getEmail();
        } else if (payment.getOrder() != null && payment.getOrder().getUser() != null) {
            owner = payment.getOrder().getUser().getEmail();
        }
        if (caller == null || owner == null || !owner.equalsIgnoreCase(caller)) {
            throw new ResourceNotFoundException("Payment", "id", payment.getId());
        }
    }

    /**
     * Deliberately NOT one big transaction: the payment status change is
     * persisted and committed on its own (each repository save runs in its
     * own transaction), so a booking that can no longer be confirmed
     * (cancelled/rejected/no-show when a late webhook lands) can never roll
     * the captured payment back to PENDING — that would make Paymob retry
     * forever. The wrong-state outcome is contained, the admin is flagged
     * to review/refund, and the webhook still ACKs.
     */
    public void handlePaymobWebhook(String payload, String hmac) {
        PaymentProvider provider = paymentProviders.stream()
            .filter(p -> p.getProviderName().equals("paymob"))
            .findFirst()
            .orElseThrow(() -> new BadRequestException("Paymob provider not found"));

        Map<String, Object> result = provider.verifyWebhook(payload, hmac);

        String orderId = (String) result.get("orderId");
        String transactionId = (String) result.get("transactionId");
        boolean success = (Boolean) result.get("success");
        boolean pending = (Boolean) result.get("pending");

        Payment payment = paymentRepository.findByProviderTransactionId(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Payment", "orderId", orderId));

        // Remember the gateway's charge id — refunds are issued against it.
        // Persist even on the idempotent path so older payments backfill.
        if (transactionId != null && !transactionId.isBlank()
                && !transactionId.equals(payment.getProviderChargeId())) {
            payment.setProviderChargeId(transactionId);
            paymentRepository.save(payment);
        }

        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            // Idempotency: Ignore if already completed
            return;
        }

        if (success && !pending) {
            payment.setStatus(PaymentStatus.COMPLETED);
            paymentRepository.save(payment);

            if (payment.getBooking() != null) {
                notificationService.sendPaymentSuccessful(
                    payment.getBooking().getClient().getEmail(),
                    payment.getBooking().getClient().getFirstName(),
                    payment.getAmount().toString(),
                    payment.getCurrency(),
                    orderId
                );

                // Confirm booking
                try {
                    bookingService.confirmBooking(payment.getBooking().getId());
                } catch (BadRequestException e) {
                    log.warn("Payment {} captured for booking #{} which is no longer pending ({}): {}",
                        orderId, payment.getBooking().getId(), payment.getBooking().getStatus(), e.getMessage());
                    notificationService.sendAdminPaymentReviewNeeded(
                        adminNotifyEmail(payment.getBooking().getTrainer().getEmail()),
                        payment.getBooking().getClient().getFirstName() + " "
                            + payment.getBooking().getClient().getLastName(),
                        payment.getBooking().getClient().getEmail(),
                        payment.getBooking().getId(),
                        payment.getBooking().getStatus().name(),
                        payment.getAmount().toPlainString(),
                        payment.getCurrency(),
                        orderId);
                }
            } else if (payment.getOrder() != null) {
                // Store order (blueprints / Academy membership): PAID +
                // fulfilment (cart clear, whitelist, receipts) — idempotent.
                var order = orderService.markOrderPaid(payment.getOrder().getId());
                notificationService.sendPaymentSuccessful(
                    order.getUser().getEmail(),
                    order.getUser().getFirstName(),
                    payment.getAmount().toString(),
                    payment.getCurrency(),
                    orderId
                );
            }
        } else if (!pending) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
        }
    }

    /** Where admin/expert notification emails go (ADMIN_NOTIFY_EMAIL overrides the trainer inbox). */
    private String adminNotifyEmail(String trainerEmail) {
        try {
            return settingsService.getString("ADMIN_NOTIFY_EMAIL", trainerEmail);
        } catch (Exception e) {
            return trainerEmail;
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

        if (!"mock".equals(payment.getProviderName())) {
            throw new BadRequestException("Only mock payments can be completed via the test endpoint.");
        }
        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            // Idempotency: ignore if already completed
            return mapToDto(payment);
        }

        // For the mock provider the transaction id doubles as the charge id,
        // so the automatic-refund pipeline exercises in dev exactly as with
        // Paymob in production.
        if (payment.getProviderChargeId() == null) {
            payment.setProviderChargeId(payment.getProviderTransactionId());
        }

        if (payment.getBooking() != null) {
            Booking booking = payment.getBooking();
            if (!isAdmin && !booking.getClient().getEmail().equalsIgnoreCase(currentUserEmail)) {
                throw new BadRequestException("You can only complete payments for your own bookings.");
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

        // Store order path (blueprints / Academy membership test purchases).
        var order = payment.getOrder();
        if (order == null) {
            throw new BadRequestException("This payment has neither a booking nor an order.");
        }
        if (!isAdmin && !order.getUser().getEmail().equalsIgnoreCase(currentUserEmail)) {
            throw new BadRequestException("You can only complete payments for your own orders.");
        }

        payment.setStatus(PaymentStatus.COMPLETED);
        paymentRepository.save(payment);
        orderService.markOrderPaid(order.getId());
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
        // Deterministic payable pair: whatever the gateway collects given the
        // currency override + conversion rate (matches PaymobProvider).
        BigDecimal payableAmount = payment.getAmount();
        String payableCurrency = payment.getCurrency();
        String override = providerConfigService.getPaymobCurrencyOverride();
        if (override != null && !override.isBlank() && !override.equalsIgnoreCase(payment.getCurrency())) {
            payableAmount = payment.getAmount()
                .multiply(providerConfigService.getEgpUsdRate())
                .setScale(2, java.math.RoundingMode.HALF_UP);
            payableCurrency = override;
        }
        return PaymentDto.builder()
            .id(payment.getId())
            .bookingId(payment.getBooking() != null ? payment.getBooking().getId() : null)
            .orderId(payment.getOrder() != null ? payment.getOrder().getId() : null)
            .amount(payment.getAmount())
            .currency(payment.getCurrency())
            .payableAmount(payableAmount)
            .payableCurrency(payableCurrency)
            .status(payment.getStatus())
            .providerName(payment.getProviderName())
            .checkoutUrl(payment.getProviderCheckoutUrl())
            .createdAt(payment.getCreatedAt())
            .build();
    }
}
