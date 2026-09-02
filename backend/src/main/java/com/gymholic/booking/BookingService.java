package com.gymholic.booking;

import com.gymholic.availability.AvailabilityRepository;
import com.gymholic.payment.PaymentRepository;
import com.gymholic.payment.entity.Payment;
import com.gymholic.common.enums.PaymentStatus;
import com.gymholic.availability.entity.Availability;
import com.gymholic.booking.dto.BookingDto;
import com.gymholic.booking.dto.CreateBookingRequest;
import com.gymholic.booking.dto.RescheduleBookingRequest;
import com.gymholic.booking.dto.RescheduleLinkSummaryDto;
import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.BookingServiceType;
import com.gymholic.common.enums.BookingStatus;
import com.gymholic.common.enums.Role;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.common.util.DateTimeUtils;
import com.gymholic.security.SecurityUtils;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.gymholic.calendar.CalendarService;
import com.gymholic.calendar.dto.CalendarEventDto;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import com.gymholic.notification.NotificationService;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

    private static final Duration RESCHEDULE_WINDOW = Duration.ofDays(14);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH);
    /** Paid consultations (strategy call, in-person, open session) are 45 minutes. */
    private static final long PAID_SESSION_MINUTES = 45;
    /** The free time session is one 3-hour block. */
    private static final long FREE_SESSION_MINUTES = 180;

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final AvailabilityRepository availabilityRepository;
    private final PaymentRepository paymentRepository;
    private final com.gymholic.settings.SettingsService settingsService;
    private final CalendarService calendarService;
    private final NotificationService notificationService;
    private final com.gymholic.calendar.ZoomService zoomService;
    private final com.gymholic.payment.RefundRepository refundRepository;

    /** First configured frontend origin — used for links inside emails. */
    @Value("${app.cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    private String frontendUrl() {
        return allowedOrigins.split(",")[0].trim();
    }

    /** Where admin/expert notification emails go (ADMIN_NOTIFY_EMAIL overrides the trainer inbox). */
    private String adminNotifyEmail(String trainerEmail) {
        try {
            return settingsService.getString("ADMIN_NOTIFY_EMAIL", trainerEmail);
        } catch (Exception e) {
            return trainerEmail;
        }
    }

    /** Booking time rendered in the client's timezone for client emails. */
    private String clientDisplayTime(Booking booking) {
        return displayTime(booking.getStartTime(), booking.getClientTimezone());
    }

    /** Booking time rendered in the expert's timezone for admin/expert emails. */
    private String expertDisplayTime(Booking booking) {
        return displayTime(booking.getStartTime(), booking.getTrainer().getTimezone());
    }

    private String displayTime(java.time.Instant time, String timezone) {
        try {
            return DateTimeUtils.formatForDisplay(time, ZoneId.of(timezone));
        } catch (Exception e) {
            return DateTimeUtils.formatForDisplay(time);
        }
    }

    @Transactional
    public BookingDto createBooking(String clientEmail, CreateBookingRequest request) {
        User client = userRepository.findByEmail(clientEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", clientEmail));

        User trainer = userRepository.findByIdForUpdate(request.getTrainerId())
            .orElseThrow(() -> new ResourceNotFoundException("Trainer", "id", request.getTrainerId()));

        // Validate that request contains valid Instant times
        if (request.getEndTime().isBefore(request.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }

        BookingServiceType serviceType = resolveServiceType(request);
        boolean freeSession = serviceType == BookingServiceType.FREE_SESSION;

        if (freeSession && !settingsService.getBool("FREE_SESSION_ENABLED", true)) {
            throw new BadRequestException("Free time sessions are currently disabled.");
        }

        long durationMinutes = Duration.between(request.getStartTime(), request.getEndTime()).toMinutes();
        if (durationMinutes != (freeSession ? FREE_SESSION_MINUTES : PAID_SESSION_MINUTES)) {
            throw new BadRequestException(freeSession
                ? "Free time session duration must be exactly 3 hours"
                : "Consultation duration must be exactly 45 minutes");
        }

        // Validate client timezone
        if (request.getClientTimezone() == null || !com.gymholic.common.util.TimezoneUtils.isValidTimezone(request.getClientTimezone())) {
            throw new BadRequestException("Valid client timezone is required");
        }

        // Get timezones
        ZoneId expertZone = trainer.getZoneId();
        ZoneId clientZone = ZoneId.of(request.getClientTimezone());
        
        log.info("Creating booking for client {} (timezone: {}) with trainer {} (timezone: {})", 
                 clientEmail, clientZone, trainer.getEmail(), expertZone);

        // Check if within availability (convert instant to expert's local time)
        ZonedDateTime startInExpertTz = request.getStartTime().atZone(expertZone);
        ZonedDateTime endInExpertTz = request.getEndTime().atZone(expertZone);
        
        DayOfWeek dayOfWeek = startInExpertTz.getDayOfWeek();
        List<Availability> availabilities = availabilityRepository.findByTrainerId(trainer.getId());
        
        boolean isAvailable = availabilities.stream().anyMatch(a -> {
            if (a.isRecurring() && a.getDayOfWeek() == dayOfWeek) {
                return !startInExpertTz.toLocalTime().isBefore(a.getStartTime()) &&
                       !endInExpertTz.toLocalTime().isAfter(a.getEndTime());
            } else if (!a.isRecurring() && a.getSpecificDate() != null && a.getSpecificDate().equals(startInExpertTz.toLocalDate())) {
                return !startInExpertTz.toLocalTime().isBefore(a.getStartTime()) &&
                       !endInExpertTz.toLocalTime().isAfter(a.getEndTime());
            }
            return false;
        });

        if (!isAvailable) {
            throw new BadRequestException("Trainer is not available at the requested time");
        }

        // The requested time slot must be available.

        Instant bufferStart = request.getStartTime().minus(Duration.ofMinutes(5));
        Instant bufferEnd = request.getEndTime().plus(Duration.ofMinutes(5));
        
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                request.getTrainerId(), 
                bufferStart, 
                bufferEnd
        );
        
        // The client's own unpaid PENDING holds don't block a fresh attempt —
        // only real (paid/confirmed or other people's pending) bookings do.
        boolean hasConflict = conflicts.stream()
            .anyMatch(b -> b.getStatus() != BookingStatus.CANCELLED
                        && b.getStatus() != BookingStatus.REJECTED
                        && !(b.getClient().getId().equals(client.getId())
                                && b.getStatus() == BookingStatus.PENDING));

        if (hasConflict) {
            throw new BadRequestException("The requested time slot is not available due to conflicts");
        }

        // One free session per trainer per expert-local day — enforced under
        // the trainer row lock taken above, so concurrent creators are
        // serialized and exactly one of them wins the day.
        if (freeSession) {
            LocalDate expertDate = request.getStartTime().atZone(expertZone).toLocalDate();
            List<Booking> sameDayFreeSessions = bookingRepository.findFreeSessionsStartingBetween(
                trainer.getId(),
                List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED),
                expertDate.atStartOfDay(expertZone).toInstant(),
                expertDate.plusDays(1).atStartOfDay(expertZone).toInstant());
            if (!sameDayFreeSessions.isEmpty()) {
                throw new BadRequestException("The free session for this day has already been booked");
            }
        }

        Booking booking = Booking.builder()
            .client(client)
            .trainer(trainer)
            .startTime(request.getStartTime())
            .endTime(request.getEndTime())
            .expertTimezone(expertZone.getId())
            .clientTimezone(clientZone.getId())
            .meetingTimezone(expertZone.getId())  // Meeting happens in expert's timezone
            .notes(request.getNotes())
            .assessmentId(request.getAssessmentId())
            .serviceType(serviceType)
            .status(BookingStatus.PENDING)
            .build();

        Booking saved = bookingRepository.save(booking);
        log.info("Booking created: ID={}, serviceType={}, startTime={} (expert: {}, client: {})",
                 saved.getId(), saved.getServiceType(), saved.getStartTime(), expertZone, clientZone);

        // Notify the admin/expert about the new (pending payment) booking
        String[] price = resolveBookingPrice(saved);
        notificationService.sendAdminNewBooking(
            adminNotifyEmail(saved.getTrainer().getEmail()),
            saved.getClient().getFirstName() + " " + saved.getClient().getLastName(),
            saved.getClient().getEmail(),
            expertDisplayTime(saved),
            price[0], price[1]
        );

        return mapToDto(saved);
    }

    /**
     * Resolves the service type for a new booking: an explicit, known
     * serviceType on the request wins; otherwise the historical note-based
     * detection ("In-Person" → IN_PERSON, "Strategy" → STRATEGY_CALL,
     * anything else → the paid OPEN_SESSION fallback).
     */
    private BookingServiceType resolveServiceType(CreateBookingRequest request) {
        if (request.getServiceType() != null && !request.getServiceType().isBlank()) {
            try {
                return BookingServiceType.valueOf(request.getServiceType().trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Unknown service type: " + request.getServiceType());
            }
        }
        String notes = request.getNotes();
        if (notes != null && notes.contains("In-Person")) {
            return BookingServiceType.IN_PERSON;
        }
        if (notes != null && notes.contains("Strategy")) {
            return BookingServiceType.STRATEGY_CALL;
        }
        return BookingServiceType.OPEN_SESSION;
    }

    /**
     * Price for a booking resolved from the configurable settings (USD).
     * All three services are paid and admin-managed: the service type is
     * recorded in the booking notes. The open time session is the fallback
     * so an unexpected note can never resolve to a free session. Public:
     * the payment service uses this to enforce the admin-managed price
     * server-side, so client-sent amounts can never override it.
     */
    public String[] resolveBookingPrice(String notes) {
        String currency = "USD";
        try {
            var all = settingsService.getAllSettings();
            currency = all.getOrDefault("BOOKING_CURRENCY", "USD");
            String amount;
            if (notes != null && notes.contains("In-Person")) {
                amount = all.getOrDefault("BOOKING_PRICE_IN_PERSON", "275");
            } else if (notes != null && notes.contains("Strategy")) {
                amount = all.getOrDefault("BOOKING_PRICE_STRATEGY_CALL", "125");
            } else {
                amount = all.getOrDefault("BOOKING_PRICE_OPEN_SESSION", "150"); // open time session
            }
            return new String[]{amount, currency};
        } catch (Exception e) {
            return new String[]{"150", currency};
        }
    }

    /**
     * Booking-aware price resolution: the free time session carries its own
     * admin-managed price (BOOKING_PRICE_FREE_SESSION), everything else
     * resolves from its notes as before.
     */
    public String[] resolveBookingPrice(Booking booking) {
        if (booking != null && booking.getServiceType() == BookingServiceType.FREE_SESSION) {
            try {
                var all = settingsService.getAllSettings();
                return new String[]{
                    all.getOrDefault("BOOKING_PRICE_FREE_SESSION", "300"),
                    all.getOrDefault("BOOKING_CURRENCY", "USD")};
            } catch (Exception e) {
                return new String[]{"300", "USD"};
            }
        }
        return resolveBookingPrice(booking == null ? null : booking.getNotes());
    }

    @Transactional(readOnly = true)
    public BookingDto getBookingById(Long id) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));
        assertCanAccess(booking, requireCurrentUser());
        return mapToDto(booking);
    }

    @Transactional(readOnly = true)
    public Page<BookingDto> getBookingsByClient(Long clientId, Pageable pageable) {
        assertSelfOrAdmin(clientId, requireCurrentUser());
        return bookingRepository.findByClientId(clientId, pageable).map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public Page<BookingDto> getBookingsByTrainer(Long trainerId, Pageable pageable) {
        assertSelfOrAdmin(trainerId, requireCurrentUser());
        return bookingRepository.findByTrainerId(trainerId, pageable).map(this::mapToDto);
    }

    @Transactional
    public BookingDto confirmBooking(Long id) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));

        if (booking.getStatus() == BookingStatus.CONFIRMED || booking.getStatus() == BookingStatus.COMPLETED) {
            // Idempotent: already confirmed
            return mapToDto(booking);
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException("Only pending bookings can be confirmed");
        }

        booking.setStatus(BookingStatus.CONFIRMED);

        // Meeting link: a real Zoom meeting when Zoom is configured, otherwise
        // the Google Calendar event's Meet link. Best-effort either way — the
        // booking still confirms if the APIs fail, it just has no link yet.
        String meetingLabel = "Google Meet";
        try {
            ZoneId expertZone = booking.getTrainer().getZoneId();
            long minutes = Duration.between(booking.getStartTime(), booking.getEndTime()).toMinutes();

            var zoomLink = zoomService.createMeeting(
                "Gymholic consultation: " + booking.getClient().getFirstName()
                    + " & " + booking.getTrainer().getFirstName(),
                booking.getStartTime(), (int) minutes);
            if (zoomLink.isPresent()) {
                booking.setMeetLink(zoomLink.get());
                meetingLabel = "Zoom";
            }
        } catch (Exception e) {
            log.warn("Zoom meeting creation failed for booking {}: {}", id, e.getMessage());
        }

        if (booking.getMeetLink() == null || booking.getMeetLink().isBlank()) {
            try {
                ZoneId expertZone = booking.getTrainer().getZoneId();
                LocalDateTime startInExpertTz = LocalDateTime.ofInstant(booking.getStartTime(), expertZone);
                LocalDateTime endInExpertTz = LocalDateTime.ofInstant(booking.getEndTime(), expertZone);

                String summary = "Consultation: " + booking.getClient().getFirstName() + " & " + booking.getTrainer().getFirstName();
                CalendarEventDto event = calendarService.createEvent(
                        booking.getTrainer().getId(),
                        summary,
                        booking.getNotes(),
                        startInExpertTz,  // Calendar service will use expert timezone
                        endInExpertTz,
                        booking.getClient().getEmail()
                );

                booking.setMeetLink(event.getMeetLink()); // Real Meet link from the Calendar event
                booking.setExternalEventId(event.getEventId());
                meetingLabel = "Google Meet";
            } catch (Exception e) {
                log.warn("Google Calendar event creation failed for booking {}: {}. Booking confirmed without Meet link.",
                    id, e.getMessage());
            }
        }

        Booking saved = bookingRepository.save(booking);

        notificationService.sendBookingConfirmation(
            saved.getClient().getEmail(),
            saved.getClient().getFirstName(),
            saved.getTrainer().getFirstName(),
            clientDisplayTime(saved),
            String.valueOf(Duration.between(saved.getStartTime(), saved.getEndTime()).toMinutes()),
            saved.getMeetLink(),
            meetingLabel,
            saved
        );

        // Notify the expert: consultation confirmed + paid (amount from the completed payment)
        String[] fallbackPrice = resolveBookingPrice(saved);
        String amount = fallbackPrice[0];
        String currency = fallbackPrice[1];
        try {
            Payment completed = paymentRepository.findByBookingId(saved.getId()).stream()
                .filter(pay -> pay.getStatus() == PaymentStatus.COMPLETED)
                .findFirst()
                .orElse(null);
            if (completed != null) {
                amount = completed.getAmount().toPlainString();
                currency = completed.getCurrency();
            }
        } catch (Exception e) {
            log.warn("Could not load payment amount for admin notification: {}", e.getMessage());
        }
        notificationService.sendAdminBookingConfirmed(
            adminNotifyEmail(saved.getTrainer().getEmail()),
            saved.getClient().getFirstName() + " " + saved.getClient().getLastName(),
            saved.getClient().getEmail(),
            expertDisplayTime(saved),
            amount,
            currency,
            saved.getMeetLink()
        );

        return mapToDto(saved);
    }

    /**
     * Cancellation policy: a PAID booking belongs to the client — the team
     * can never cancel it out from under them. The client may cancel free
     * of charge up to 12 hours before the session; the payment is then
     * flagged as a PENDING refund for the team to settle with the gateway.
     */
    static final java.time.Duration FREE_CANCELLATION_WINDOW = java.time.Duration.ofHours(12);

    @Transactional
    public BookingDto cancelBooking(Long id, String reason) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));
        User current = requireCurrentUser();
        assertCanAccess(booking, current);

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            // Idempotent
            return mapToDto(booking);
        }

        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Only pending or confirmed bookings can be cancelled");
        }

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            // Paid booking: the client decides, never the team.
            if (!current.getId().equals(booking.getClient().getId())) {
                throw new BadRequestException(
                    "Paid bookings belong to the client — they cancel them from their account. "
                        + "If there's a problem, agree a refund with the client and settle it from Admin → Refunds.");
            }
            if (Instant.now().isAfter(booking.getStartTime().minus(FREE_CANCELLATION_WINDOW))) {
                throw new BadRequestException(
                    "Free cancellation closed — bookings can be cancelled up to 12 hours before the session. "
                        + "Past that, contact us and we'll find a solution.");
            }
        }

        BookingStatus oldStatus = booking.getStatus();
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancellationReason(reason);

        Booking saved = bookingRepository.save(booking);

        // Money side of the policy: a cancelled paid booking records a
        // refund-due entry the team settles with the gateway.
        if (oldStatus == BookingStatus.CONFIRMED) {
            recordRefundDue(saved, reason);
        }

        if (oldStatus == BookingStatus.CONFIRMED && saved.getExternalEventId() != null) {
            // Cancel the Google Calendar event
            try {
                calendarService.deleteEvent(saved.getTrainer().getId(), saved.getExternalEventId());
            } catch (Exception e) {
                // Log and continue, do not fail cancellation if Google fails
                System.err.println("Failed to cancel Google Calendar event: " + e.getMessage());
            }
        }
        
        notificationService.sendBookingCancellation(
            saved.getClient().getEmail(),
            saved.getClient().getFirstName(),
            clientDisplayTime(saved),
            reason
        );

        return mapToDto(saved);
    }

    /** Records the money owed after a client cancels a paid booking. */
    private void recordRefundDue(Booking booking, String reason) {
        paymentRepository.findByBookingId(booking.getId()).stream()
            .filter(p -> p.getStatus() == PaymentStatus.COMPLETED)
            .max(java.util.Comparator.comparing(Payment::getId))
            .ifPresent(payment -> refundRepository.save(
                com.gymholic.payment.entity.Refund.builder()
                    .payment(payment)
                    .amount(payment.getAmount())
                    .reason("Client cancellation (free window) — " + (reason == null || reason.isBlank() ? "no reason given" : reason))
                    .status(PaymentStatus.PENDING)
                    .build()));
        log.info("Booking {} cancelled by client — refund due recorded", booking.getId());
    }

    @Transactional
    public BookingDto rescheduleBooking(Long id, RescheduleBookingRequest request) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));
        assertTrainerOrAdmin(booking, requireCurrentUser());

        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException("Only pending or confirmed bookings can be rescheduled");
        }

        if (request.getNewStartTime().isBefore(Instant.now())) {
            throw new BadRequestException("Please choose a future time slot.");
        }

        validateNewTime(booking.getTrainer(), booking.getId(),
            request.getNewStartTime(), request.getNewEndTime(),
            booking.getServiceType() == BookingServiceType.FREE_SESSION ? FREE_SESSION_MINUTES : PAID_SESSION_MINUTES);

        Instant oldStartTime = booking.getStartTime();
        booking.setStartTime(request.getNewStartTime());
        booking.setEndTime(request.getNewEndTime());
        booking.setRescheduleCount(booking.getRescheduleCount() + 1);

        Booking saved = bookingRepository.save(booking);

        updateCalendarEvent(saved);

        notificationService.sendBookingRescheduledWithInvite(
            saved.getClient().getEmail(),
            saved.getClient().getFirstName(),
            saved.getTrainer().getFirstName(),
            displayTime(oldStartTime, saved.getClientTimezone()),
            displayTime(saved.getStartTime(), saved.getClientTimezone()),
            saved.getMeetLink(),
            saved
        );

        return mapToDto(saved);
    }

    /**
     * Admin action: declines a pending booking (slot no longer workable,
     * payment issue, …). The client is emailed with the reason — paid
     * bookings should be refunded manually when appropriate.
     */
    @Transactional
    public BookingDto rejectBooking(Long id, String reason) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));

        if (booking.getStatus() == BookingStatus.REJECTED) {
            return mapToDto(booking); // idempotent
        }
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException("Only pending bookings can be rejected");
        }

        booking.setStatus(BookingStatus.REJECTED);
        booking.setCancellationReason(reason);
        Booking saved = bookingRepository.save(booking);

        notificationService.sendBookingRejected(
            saved.getClient().getEmail(),
            saved.getClient().getFirstName(),
            clientDisplayTime(saved),
            reason
        );
        log.info("Booking {} rejected by admin", id);
        return mapToDto(saved);
    }

    /**
     * Admin action: closes a confirmed session as delivered/ended. Used for
     * sessions the expert finished (the scheduler auto-completes most of
     * these; this covers the rest).
     */
    @Transactional
    public BookingDto completeSession(Long id) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));

        if (booking.getStatus() == BookingStatus.COMPLETED) {
            return mapToDto(booking); // idempotent
        }
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Only confirmed sessions can be marked as completed");
        }

        booking.setStatus(BookingStatus.COMPLETED);
        Booking saved = bookingRepository.save(booking);

        notificationService.sendBookingCompleted(
            saved.getClient().getEmail(),
            saved.getClient().getFirstName(),
            saved.getTrainer().getFirstName(),
            clientDisplayTime(saved)
        );
        log.info("Booking {} marked as completed by admin", id);
        return mapToDto(saved);
    }

    /**
     * Marks a delivered-window session as a no-show. When the expert attended,
     * the client's payment is kept as credit with a one-time reschedule link;
     * when the expert missed it too, the email offers a full refund or a free
     * rebooking and the admin is flagged to process the refund.
     */
    @Transactional
    public BookingDto markNoShow(Long id, boolean expertAttended, String note) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));

        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.COMPLETED) {
            throw new BadRequestException("Only confirmed or completed sessions can be marked as a no-show");
        }

        booking.setStatus(BookingStatus.NO_SHOW);
        booking.setExpertAttended(expertAttended);
        booking.setNoShowNote(note);
        booking.setRescheduleToken(UUID.randomUUID().toString().replace("-", ""));
        int windowDays = Math.max(1, settingsService.getInt("RESCHEDULE_WINDOW_DAYS", (int) RESCHEDULE_WINDOW.toDays()));
        booking.setRescheduleExpiresAt(Instant.now().plus(Duration.ofDays(windowDays)));

        Booking saved = bookingRepository.save(booking);

        String dateTime = displayTime(saved.getStartTime(), saved.getClientTimezone());
        String rescheduleUrl = frontendUrl() + "/reschedule?token=" + saved.getRescheduleToken();
        String expiresOn = DATE_FORMAT.format(LocalDate.now().plusDays(windowDays));

        notificationService.sendClientNoShow(
            saved.getClient().getEmail(),
            saved.getClient().getFirstName(),
            dateTime,
            rescheduleUrl,
            expiresOn,
            expertAttended
        );

        notificationService.sendAdminNoShow(
            adminNotifyEmail(saved.getTrainer().getEmail()),
            saved.getClient().getFirstName() + " " + saved.getClient().getLastName(),
            saved.getClient().getEmail(),
            dateTime,
            expertAttended,
            note,
            !expertAttended
        );

        log.info("Booking {} marked as no-show (expertAttended={}); reschedule link emailed to {}",
            id, expertAttended, saved.getClient().getEmail());
        return mapToDto(saved);
    }

    /** Public (token-protected) summary for the /reschedule page. */
    @Transactional(readOnly = true)
    public RescheduleLinkSummaryDto getRescheduleLink(String token) {
        Booking booking = requireValidRescheduleToken(token);
        return RescheduleLinkSummaryDto.builder()
            .bookingId(booking.getId())
            .clientFirstName(booking.getClient().getFirstName())
            .trainerName(booking.getTrainer().getFirstName() + " " + booking.getTrainer().getLastName())
            .originalStartTime(booking.getStartTime())
            .rescheduleExpiresAt(booking.getRescheduleExpiresAt())
            .clientTimezone(booking.getClientTimezone())
            .expertAttended(booking.getExpertAttended())
            .build();
    }

    /** Trainer behind a reschedule token — for the public slots endpoint. */
    @Transactional(readOnly = true)
    public Long getTrainerIdForRescheduleToken(String token) {
        return requireValidRescheduleToken(token).getTrainer().getId();
    }

    /**
     * Client self-reschedule through the emailed one-time link (no sign-in
     * required). The session was already paid, so the booking goes straight
     * back to CONFIRMED at the new time and the token is consumed.
     */
    @Transactional
    public BookingDto rescheduleByToken(String token, RescheduleBookingRequest request) {
        Booking booking = requireValidRescheduleToken(token);

        if (request.getNewStartTime().isBefore(Instant.now())) {
            throw new BadRequestException("Please choose a future time slot.");
        }

        validateNewTime(booking.getTrainer(), booking.getId(),
            request.getNewStartTime(), request.getNewEndTime(),
            booking.getServiceType() == BookingServiceType.FREE_SESSION ? FREE_SESSION_MINUTES : PAID_SESSION_MINUTES);

        Instant oldStartTime = booking.getStartTime();
        booking.setStartTime(request.getNewStartTime());
        booking.setEndTime(request.getNewEndTime());
        booking.setStatus(BookingStatus.CONFIRMED); // paid session — re-confirmed at the new time
        booking.setRescheduleCount(booking.getRescheduleCount() + 1);
        booking.setRescheduleToken(null);           // one-time link: consume it
        booking.setRescheduleExpiresAt(null);

        Booking saved = bookingRepository.save(booking);

        updateCalendarEvent(saved);

        notificationService.sendBookingRescheduledWithInvite(
            saved.getClient().getEmail(),
            saved.getClient().getFirstName(),
            saved.getTrainer().getFirstName(),
            displayTime(oldStartTime, saved.getClientTimezone()),
            displayTime(saved.getStartTime(), saved.getClientTimezone()),
            saved.getMeetLink(),
            saved
        );
        notificationService.sendBookingConfirmation(
            adminNotifyEmail(saved.getTrainer().getEmail()),
            saved.getTrainer().getFirstName(),
            "rescheduled session with " + saved.getClient().getFirstName(),
            expertDisplayTime(saved),
            "45",
            saved.getMeetLink()
        );

        log.info("Booking {} rescheduled by client via one-time link", booking.getId());
        return mapToDto(saved);
    }

    /**
     * Auto-cancels stale PENDING bookings (abandoned checkouts): ones whose
     * slot already started or whose payment was never completed within two
     * hours. Frees the slot for everyone and lets the same client re-book.
     * PENDING bookings never have a calendar event, so nothing external
     * needs cleaning up.
     */
    @Transactional
    public void expireStalePendingBookings() {
        List<Booking> stale = bookingRepository.findStalePendingBookings(
            Instant.now(), LocalDateTime.now().minus(Duration.ofHours(2)));
        for (Booking booking : stale) {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setCancellationReason("Automatically cancelled — payment not completed");
            bookingRepository.save(booking);

            notificationService.sendBookingExpired(
                booking.getClient().getEmail(),
                booking.getClient().getFirstName(),
                clientDisplayTime(booking));
            log.info("Expired stale pending booking #{} (startTime={}, createdAt={})",
                booking.getId(), booking.getStartTime(), booking.getCreatedAt());
        }
    }

    /** The signed-in user (HTTP requests only — scheduler/webhook threads carry no security context). */
    private User requireCurrentUser() {
        String email = SecurityUtils.getCurrentUserEmail();
        if (email == null) {
            throw new AccessDeniedException("Access denied");
        }
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    /** Booking details are visible to its client, its trainer, or an admin. */
    private void assertCanAccess(Booking booking, User current) {
        if (current.getRole() != Role.ADMIN
                && !current.getId().equals(booking.getClient().getId())
                && !current.getId().equals(booking.getTrainer().getId())) {
            throw new AccessDeniedException("Access denied");
        }
    }

    /** A user's own scoped listings are visible to that user or an admin. */
    private void assertSelfOrAdmin(Long targetUserId, User current) {
        if (current.getRole() != Role.ADMIN && !current.getId().equals(targetUserId)) {
            throw new AccessDeniedException("Access denied");
        }
    }

    /** Rescheduling an existing booking is the trainer's (or an admin's) call. */
    private void assertTrainerOrAdmin(Booking booking, User current) {
        if (current.getRole() != Role.ADMIN
                && !current.getId().equals(booking.getTrainer().getId())) {
            throw new AccessDeniedException("Access denied");
        }
    }

    private Booking requireValidRescheduleToken(String token) {
        Booking booking = bookingRepository.findByRescheduleToken(token)
            .orElseThrow(() -> new ResourceNotFoundException("Reschedule link", "token", "invalid"));
        if (booking.getStatus() != BookingStatus.NO_SHOW) {
            throw new BadRequestException("This reschedule link is no longer active.");
        }
        if (booking.getRescheduleExpiresAt() != null && Instant.now().isAfter(booking.getRescheduleExpiresAt())) {
            throw new BadRequestException("This reschedule link has expired. Please contact us to book again.");
        }
        return booking;
    }

    /** Shared validation for any new booking time: duration, availability, conflicts. */
    private void validateNewTime(User trainer, Long excludeBookingId, Instant newStart, Instant newEnd, long expectedMinutes) {
        if (newEnd.isBefore(newStart)) {
            throw new BadRequestException("End time must be after start time");
        }
        long durationMinutes = Duration.between(newStart, newEnd).toMinutes();
        if (durationMinutes != expectedMinutes) {
            throw new BadRequestException(expectedMinutes == FREE_SESSION_MINUTES
                ? "Free time session duration must be exactly 3 hours"
                : "Consultation duration must be exactly 45 minutes");
        }

        ZoneId expertZone = trainer.getZoneId();
        ZonedDateTime startInExpertTz = newStart.atZone(expertZone);
        ZonedDateTime endInExpertTz = newEnd.atZone(expertZone);

        DayOfWeek dayOfWeek = startInExpertTz.getDayOfWeek();
        List<com.gymholic.availability.entity.Availability> availabilities =
            availabilityRepository.findByTrainerId(trainer.getId());

        boolean isAvailable = availabilities.stream().anyMatch(a -> {
            if (a.isRecurring() && a.getDayOfWeek() == dayOfWeek) {
                return !startInExpertTz.toLocalTime().isBefore(a.getStartTime()) &&
                       !endInExpertTz.toLocalTime().isAfter(a.getEndTime());
            } else if (!a.isRecurring() && a.getSpecificDate() != null && a.getSpecificDate().equals(startInExpertTz.toLocalDate())) {
                return !startInExpertTz.toLocalTime().isBefore(a.getStartTime()) &&
                       !endInExpertTz.toLocalTime().isAfter(a.getEndTime());
            }
            return false;
        });
        if (!isAvailable) {
            throw new BadRequestException("Trainer is not available at the requested time");
        }

        Instant bufferStart = newStart.minus(Duration.ofMinutes(5));
        Instant bufferEnd = newEnd.plus(Duration.ofMinutes(5));
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
            trainer.getId(), bufferStart, bufferEnd);
        boolean hasConflict = conflicts.stream()
            .anyMatch(b -> b.getStatus() != BookingStatus.CANCELLED
                        && b.getStatus() != BookingStatus.REJECTED
                        && !b.getId().equals(excludeBookingId));
        if (hasConflict) {
            throw new BadRequestException("The requested time slot is not available due to conflicts");
        }
    }

    /** Best-effort sync of the booking's new time to the Google Calendar event. */
    private void updateCalendarEvent(Booking booking) {
        if (booking.getStatus() == BookingStatus.CONFIRMED && booking.getExternalEventId() != null) {
            try {
                ZoneId expertZone = booking.getTrainer().getZoneId();
                calendarService.updateEvent(
                    booking.getTrainer().getId(),
                    booking.getExternalEventId(),
                    null,
                    null,
                    LocalDateTime.ofInstant(booking.getStartTime(), expertZone),
                    LocalDateTime.ofInstant(booking.getEndTime(), expertZone)
                );
            } catch (Exception e) {
                log.warn("Failed to update Google Calendar event for booking {}: {}",
                    booking.getId(), e.getMessage());
            }
        }
    }

    private BookingDto mapToDto(Booking booking) {
        return BookingDto.builder()
            .id(booking.getId())
            .clientId(booking.getClient().getId())
            .clientName(booking.getClient().getFirstName() + " " + booking.getClient().getLastName())
            .trainerId(booking.getTrainer().getId())
            .trainerName(booking.getTrainer().getFirstName() + " " + booking.getTrainer().getLastName())
            .startTime(booking.getStartTime())
            .endTime(booking.getEndTime())
            .expertTimezone(booking.getExpertTimezone())
            .clientTimezone(booking.getClientTimezone())
            .meetingTimezone(booking.getMeetingTimezone())
            .status(booking.getStatus())
            .serviceType(booking.getServiceType() == null ? null : booking.getServiceType().name())
            .assessmentId(booking.getAssessmentId())
            .notes(booking.getNotes())
            .meetLink(booking.getMeetLink())
            .externalEventId(booking.getExternalEventId())
            .expertAttended(booking.getExpertAttended())
            .noShowNote(booking.getNoShowNote())
            .rescheduleCount(booking.getRescheduleCount())
            .createdAt(booking.getCreatedAt())
            .build();
    }
}
