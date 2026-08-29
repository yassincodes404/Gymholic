package com.gymholic.availability;

import com.gymholic.availability.dto.AvailabilityDto;
import com.gymholic.availability.dto.AvailableSlotDto;
import com.gymholic.availability.dto.BookingTrainerDto;
import com.gymholic.availability.dto.CalendarDayDto;
import com.gymholic.availability.dto.CreateAvailabilityRequest;
import com.gymholic.availability.entity.Availability;
import com.gymholic.common.enums.Role;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.common.util.TimezoneUtils;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gymholic.booking.BookingRepository;
import com.gymholic.booking.entity.Booking;
import java.time.*;
import java.time.temporal.ChronoField;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AvailabilityService {

    /** Service-type name that switches slot generation to 3-hour free blocks. */
    private static final String FREE_SESSION_SERVICE = "FREE_SESSION";
    private static final int STANDARD_SLOT_MINUTES = 45;
    private static final int STANDARD_STEP_MINUTES = 50;
    private static final int FREE_SESSION_MINUTES = 180;
    private static final int FREE_SESSION_STEP_MINUTES = 30;

    private final AvailabilityRepository availabilityRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    @Transactional
    public AvailabilityDto createAvailability(String trainerEmail, CreateAvailabilityRequest request) {
        User trainer = userRepository.findByEmail(trainerEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", trainerEmail));

        if (trainer.getRole() != Role.ADMIN && trainer.getRole() != Role.TRAINER) {
            throw new AccessDeniedException("Only admins and trainers can manage availability");
        }

        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }
        if (request.isRecurring() && request.getDayOfWeek() == null) {
            throw new BadRequestException("Day of week is required for recurring availability");
        }
        if (request.isRecurring()
                && availabilityRepository.existsByTrainerIdAndDayOfWeekAndStartTimeAndEndTimeAndRecurringTrue(
                       trainer.getId(), request.getDayOfWeek(), request.getStartTime(), request.getEndTime())) {
            throw new BadRequestException("That window already exists for " + request.getDayOfWeek());
        }

        Availability availability = Availability.builder()
            .trainer(trainer)
            .dayOfWeek(request.getDayOfWeek())
            .startTime(request.getStartTime())
            .endTime(request.getEndTime())
            .recurring(request.isRecurring())
            .specificDate(request.getSpecificDate())
            .build();

        Availability saved = availabilityRepository.save(availability);
        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public List<AvailabilityDto> getTrainerAvailability(Long trainerId) {
        return availabilityRepository.findByTrainerId(trainerId)
            .stream()
            .map(this::mapToDto)
            .toList();
    }

    /**
     * Resolves the expert customers book against. Single-expert product: the
     * owner of the most recently created availability window wins (i.e. whoever
     * last edited working hours), otherwise the first ADMIN, otherwise the
     * first TRAINER.
     */
    @Transactional(readOnly = true)
    public BookingTrainerDto resolveBookingTrainer() {
        return availabilityRepository.findFirstByOrderByIdDesc()
            .map(a -> mapToBookingTrainerDto(a.getTrainer()))
            .orElseGet(() -> userRepository.findFirstByRoleInOrderByIdAsc(List.of(Role.ADMIN, Role.TRAINER))
                .map(this::mapToBookingTrainerDto)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer", "role", "ADMIN/TRAINER")));
    }

    private BookingTrainerDto mapToBookingTrainerDto(User trainer) {
        return BookingTrainerDto.builder()
            .trainerId(trainer.getId())
            .trainerName(trainer.getFirstName() + " " + trainer.getLastName())
            .timezone(trainer.getTimezone())
            .build();
    }

    /**
     * Get available consultation slots for a trainer on a specific date,
     * converted to the client's timezone (standard 45-minute services).
     */
    @Transactional(readOnly = true)
    public List<AvailableSlotDto> getAvailableSlots(Long trainerId, LocalDate date, String clientTimezone) {
        return getAvailableSlots(trainerId, date, clientTimezone, null);
    }

    /**
     * Service-aware slot generation. The default (null/blank service)
     * behaves exactly like the historical 45-minute grid; service
     * "FREE_SESSION" generates 3-hour blocks on a 30-minute step grid that
     * must fit entirely inside a single availability window, with the same
     * client-day, past-time, DST-gap and conflict rules. A day whose free
     * session is already taken offers no FREE_SESSION slots at all.
     *
     * @param trainerId The expert/trainer ID
     * @param date The date to check availability (client's calendar)
     * @param clientTimezone Client's IANA timezone ID (e.g., "Asia/Dubai")
     * @param service Optional service type name ("FREE_SESSION"); null = standard
     */
    @Transactional(readOnly = true)
    public List<AvailableSlotDto> getAvailableSlots(Long trainerId, LocalDate date, String clientTimezone, String service) {
        // Validate and get trainer
        User trainer = userRepository.findById(trainerId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer", "id", trainerId));

        // Validate client timezone
        if (!TimezoneUtils.isValidTimezone(clientTimezone)) {
            throw new BadRequestException("Invalid client timezone: " + clientTimezone);
        }

        ZoneId expertZone = trainer.getZoneId();  // Expert's timezone from User entity
        ZoneId clientZone = ZoneId.of(clientTimezone);
        boolean freeSession = FREE_SESSION_SERVICE.equals(service);
        int slotMinutes = freeSession ? FREE_SESSION_MINUTES : STANDARD_SLOT_MINUTES;
        int stepMinutes = freeSession ? FREE_SESSION_STEP_MINUTES : STANDARD_STEP_MINUTES;

        log.debug("Generating {} slots for trainer {} in timezone {}, converting to client timezone {}",
                  service, trainerId, expertZone, clientZone);

        // The picked date is the client's calendar day — a big offset means it
        // may span one or two expert-local dates.
        Instant clientDayStart = date.atStartOfDay(clientZone).toInstant();
        Instant clientDayEnd = date.plusDays(1).atStartOfDay(clientZone).toInstant();
        List<LocalDate> spannedExpertDates = expertDatesBetween(clientDayStart, clientDayEnd, expertZone);

        // Find matching availabilities across every spanned expert date
        List<Availability> availabilities = availabilityRepository.findByTrainerId(trainerId).stream()
            .filter(a -> spannedExpertDates.stream().anyMatch(d -> matchesDate(a, d)))
            .toList();

        if (availabilities.isEmpty()) {
            log.debug("No availability found for trainer {} spanning client date {}", trainerId, date);
            return List.of();
        }

        // Generate potential slots in EXPERT's timezone, per (window, expert date)
        List<Instant> potentialSlotInstants = new ArrayList<>();
        Instant now = Instant.now();

        for (Availability avail : availabilities) {
            for (LocalDate expertDate : spannedExpertDates) {
                if (!matchesDate(avail, expertDate)) {
                    continue;
                }
                potentialSlotInstants.addAll(
                    generateWindowSlots(avail, expertDate, expertZone, slotMinutes, stepMinutes));
            }
        }

        // Fetch bookings that could collide with slots on this client day
        List<Booking> bookings = getBookingsForRange(trainerId, clientDayStart, clientDayEnd, slotMinutes);
        // Expert-local dates whose free session is already taken (one per day rule)
        Set<LocalDate> takenFreeDates = freeSession
            ? takenFreeSessionDates(trainerId, spannedExpertDates, expertZone)
            : Set.of();

        // Keep only future slots that start on the client's picked day and
        // aren't taken (same overlap rule as booking creation); drop
        // duplicates caused by overlapping/contained windows.
        List<Instant> availableInstants = potentialSlotInstants.stream()
            .filter(slot -> !slot.isBefore(now))
            .filter(slot -> !slot.isBefore(clientDayStart) && slot.isBefore(clientDayEnd))
            .filter(slot -> !isSlotBooked(slot, bookings, slotMinutes))
            .filter(slot -> !freeSession || !takenFreeDates.contains(slot.atZone(expertZone).toLocalDate()))
            .distinct()
            .sorted()
            .toList();

        // Convert to DTOs with timezone information
        return availableInstants.stream()
            .map(instant -> buildSlotDto(instant, expertZone, clientZone, slotMinutes))
            .toList();
    }

    /**
     * Month calendar for the booking UI: one status per client-calendar day
     * of the requested month, computed with the same slot logic as the
     * per-day endpoint. Statuses: past | closed | fully-booked | available
     * (+ booked for FREE_SESSION days that are already taken).
     */
    @Transactional(readOnly = true)
    public List<CalendarDayDto> getMonthCalendar(Long trainerId, YearMonth month, String clientTimezone, String service) {
        User trainer = userRepository.findById(trainerId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer", "id", trainerId));

        if (!TimezoneUtils.isValidTimezone(clientTimezone)) {
            throw new BadRequestException("Invalid client timezone: " + clientTimezone);
        }

        ZoneId expertZone = trainer.getZoneId();
        ZoneId clientZone = ZoneId.of(clientTimezone);
        boolean freeSession = FREE_SESSION_SERVICE.equals(service);
        int slotMinutes = freeSession ? FREE_SESSION_MINUTES : STANDARD_SLOT_MINUTES;
        int stepMinutes = freeSession ? FREE_SESSION_STEP_MINUTES : STANDARD_STEP_MINUTES;

        Instant monthStart = month.atDay(1).atStartOfDay(clientZone).toInstant();
        Instant monthEnd = month.plusMonths(1).atDay(1).atStartOfDay(clientZone).toInstant();

        List<Availability> availabilities = availabilityRepository.findByTrainerId(trainerId);
        List<Booking> bookings = getBookingsForRange(trainerId, monthStart, monthEnd, slotMinutes);
        List<LocalDate> spannedExpertDates = expertDatesBetween(monthStart, monthEnd, expertZone);
        Set<LocalDate> takenFreeDates = freeSession
            ? takenFreeSessionDates(trainerId, spannedExpertDates, expertZone)
            : Set.of();

        Instant now = Instant.now();
        List<CalendarDayDto> days = new ArrayList<>();
        for (LocalDate date = month.atDay(1); !date.isAfter(month.atEndOfMonth()); date = date.plusDays(1)) {
            days.add(CalendarDayDto.builder()
                .date(date)
                .status(dayStatus(date, clientZone, expertZone, availabilities, bookings,
                    takenFreeDates, slotMinutes, stepMinutes, now))
                .build());
        }
        return days;
    }

    /** Maps one client-calendar day to its calendar status using the live slot rules. */
    private String dayStatus(LocalDate date, ZoneId clientZone, ZoneId expertZone,
                             List<Availability> availabilities, List<Booking> bookings,
                             Set<LocalDate> takenFreeDates, int slotMinutes, int stepMinutes,
                             Instant now) {
        Instant dayStart = date.atStartOfDay(clientZone).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(clientZone).toInstant();
        if (!dayEnd.isAfter(now)) {
            return "past";
        }

        List<LocalDate> spannedExpertDates = expertDatesBetween(dayStart, dayEnd, expertZone);
        List<Availability> matched = availabilities.stream()
            .filter(a -> spannedExpertDates.stream().anyMatch(d -> matchesDate(a, d)))
            .toList();
        if (matched.isEmpty()) {
            return "closed";
        }

        boolean hasSlot = false;
        for (Availability avail : matched) {
            for (LocalDate expertDate : spannedExpertDates) {
                if (!matchesDate(avail, expertDate)) {
                    continue;
                }
                for (Instant slot : generateWindowSlots(avail, expertDate, expertZone, slotMinutes, stepMinutes)) {
                    if (slot.isBefore(now) || slot.isBefore(dayStart) || !slot.isBefore(dayEnd)) {
                        continue;
                    }
                    if (isSlotBooked(slot, bookings, slotMinutes)) {
                        continue;
                    }
                    if (takenFreeDates.contains(slot.atZone(expertZone).toLocalDate())) {
                        continue;
                    }
                    hasSlot = true;
                    break;
                }
                if (hasSlot) break;
            }
            if (hasSlot) break;
        }
        if (hasSlot) {
            return "available";
        }
        // No bookable slot left on this day: already-taken free days are
        // reported distinctly from ordinary fully-booked ones.
        boolean freeDayTaken = !takenFreeDates.isEmpty()
            && spannedExpertDates.stream().anyMatch(takenFreeDates::contains);
        return freeDayTaken ? "booked" : "fully-booked";
    }

    /**
     * Candidate slot starts for one window on one expert date: starts at the
     * window start, steps on the service's grid, only emits blocks that fit
     * entirely inside the window, and skips DST-gap local times.
     */
    private List<Instant> generateWindowSlots(Availability avail, LocalDate expertDate, ZoneId expertZone,
                                              int slotMinutes, int stepMinutes) {
        List<Instant> slots = new ArrayList<>();
        // Minute-based walk (LocalTime would wrap past midnight and
        // never terminate for windows ending late in the day).
        int startMinute = avail.getStartTime().get(ChronoField.MINUTE_OF_DAY);
        int endMinute = avail.getEndTime().get(ChronoField.MINUTE_OF_DAY);
        for (int minute = startMinute; minute + slotMinutes <= endMinute; minute += stepMinutes) {
            LocalTime current = LocalTime.of(minute / 60, minute % 60);
            // Skip local times that don't exist in the expert zone (DST gap)
            if (TimezoneUtils.timeExists(expertDate, current, expertZone)) {
                slots.add(TimezoneUtils.toInstant(expertDate, current, expertZone));
            }
        }
        return slots;
    }

    /**
     * Expert-local start dates (within the given span) that already have a
     * live PENDING/CONFIRMED free session for this trainer — the free
     * session is one per trainer per expert-local day.
     */
    private Set<LocalDate> takenFreeSessionDates(Long trainerId, List<LocalDate> spannedExpertDates, ZoneId expertZone) {
        if (spannedExpertDates.isEmpty()) {
            return Set.of();
        }
        LocalDate first = spannedExpertDates.get(0);
        LocalDate last = spannedExpertDates.get(spannedExpertDates.size() - 1);
        List<Booking> freeSessions = bookingRepository.findFreeSessionsStartingBetween(
            trainerId,
            List.of(com.gymholic.common.enums.BookingStatus.PENDING, com.gymholic.common.enums.BookingStatus.CONFIRMED),
            first.atStartOfDay(expertZone).toInstant(),
            last.plusDays(1).atStartOfDay(expertZone).toInstant());
        return freeSessions.stream()
            .map(b -> b.getStartTime().atZone(expertZone).toLocalDate())
            .collect(Collectors.toSet());
    }

    /**
     * Expert-local dates spanned by the half-open instant range [start, end).
     * The end instant itself is excluded (minus one nanosecond) so a range
     * ending exactly at midnight doesn't pull in the next calendar day.
     */
    private List<LocalDate> expertDatesBetween(Instant start, Instant end, ZoneId expertZone) {
        LocalDate first = start.atZone(expertZone).toLocalDate();
        LocalDate last = end.minusNanos(1).atZone(expertZone).toLocalDate();
        return first.datesUntil(last.plusDays(1)).toList();
    }

    /** Whether an availability window applies to the given expert-local date. */
    private boolean matchesDate(Availability availability, LocalDate expertDate) {
        if (availability.isRecurring()) {
            return availability.getDayOfWeek() == expertDate.getDayOfWeek();
        }
        return expertDate.equals(availability.getSpecificDate());
    }

    /**
     * Bookings that could collide with slots inside the client-day instant
     * range. Fetches bookings overlapping the range padded by one slot
     * length so sessions spilling over the edges are still considered.
     */
    private List<Booking> getBookingsForRange(Long trainerId, Instant start, Instant end, int slotMinutes) {
        return bookingRepository.findConflictingBookings(
            trainerId,
            start.minus(Duration.ofMinutes(slotMinutes)),
            end.plus(Duration.ofMinutes(slotMinutes)));
    }

    /**
     * A slot is blocked iff it collides with a PENDING/CONFIRMED booking
     * under the same ±5-minute-buffered interval-overlap rule the booking
     * creation check uses.
     */
    private boolean isSlotBooked(Instant slotStart, List<Booking> bookings, int slotMinutes) {
        Instant slotEnd = slotStart.plus(Duration.ofMinutes(slotMinutes));
        Instant bufferStart = slotStart.minus(Duration.ofMinutes(5));
        Instant bufferEnd = slotEnd.plus(Duration.ofMinutes(5));
        return bookings.stream()
            .anyMatch(b -> b.getStartTime().isBefore(bufferEnd)
                        && b.getEndTime().isAfter(bufferStart));
    }

    /**
     * Build AvailableSlotDto with complete timezone context
     */
    private AvailableSlotDto buildSlotDto(Instant instant, ZoneId expertZone, ZoneId clientZone, int slotMinutes) {
        // Convert instant to expert's local time
        ZonedDateTime expertTime = TimezoneUtils.toZonedDateTime(instant, expertZone);

        // Convert instant to client's local time
        ZonedDateTime clientTime = TimezoneUtils.toZonedDateTime(instant, clientZone);

        return AvailableSlotDto.builder()
            .startTime(instant)
            .endTime(instant.plus(slotMinutes, ChronoUnit.MINUTES))
            .displayTime(String.format("%02d:%02d", clientTime.getHour(), clientTime.getMinute()))
            .expertDisplayTime(String.format("%02d:%02d", expertTime.getHour(), expertTime.getMinute()))
            .expertTimezone(expertZone.getId())
            .clientTimezone(clientZone.getId())
            .build();
    }

    @Transactional
    public void deleteAvailability(Long id) {
        Availability availability = availabilityRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Availability", "id", id));

        String email = com.gymholic.security.SecurityUtils.getCurrentUserEmail();
        User current = email != null
            ? userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email))
            : null;
        if (current == null
                || (current.getRole() != Role.ADMIN
                    && !current.getId().equals(availability.getTrainer().getId()))) {
            throw new AccessDeniedException("Only the owning trainer or an admin can delete availability");
        }

        availabilityRepository.delete(availability);
    }

    private AvailabilityDto mapToDto(Availability availability) {
        return AvailabilityDto.builder()
            .id(availability.getId())
            .trainerId(availability.getTrainer().getId())
            .trainerName(availability.getTrainer().getFirstName() + " " +
                         availability.getTrainer().getLastName())
            .dayOfWeek(availability.getDayOfWeek())
            .startTime(availability.getStartTime())
            .endTime(availability.getEndTime())
            .recurring(availability.isRecurring())
            .specificDate(availability.getSpecificDate())
            .build();
    }
}
