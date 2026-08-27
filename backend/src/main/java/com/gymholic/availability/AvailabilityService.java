package com.gymholic.availability;

import com.gymholic.availability.dto.AvailabilityDto;
import com.gymholic.availability.dto.AvailableSlotDto;
import com.gymholic.availability.dto.BookingTrainerDto;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AvailabilityService {

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
     * converted to the client's timezone.
     *
     * This method:
     * 1. Gets expert's timezone from User entity
     * 2. Validates client timezone
     * 3. Interprets the requested date in the CLIENT's calendar and finds
     *    every expert-local date it spans
     * 4. Generates slots from the windows of every spanned expert date
     * 5. Keeps only slots that start on the client's picked day, in the future
     * 6. Filters out booked slots
     * 7. Returns slots with complete timezone context
     *
     * @param trainerId The expert/trainer ID
     * @param date The date to check availability (client's calendar)
     * @param clientTimezone Client's IANA timezone ID (e.g., "Asia/Dubai")
     * @return List of available slots in client's timezone with context
     */
    @Transactional(readOnly = true)
    public List<AvailableSlotDto> getAvailableSlots(Long trainerId, LocalDate date, String clientTimezone) {
        // Validate and get trainer
        User trainer = userRepository.findById(trainerId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer", "id", trainerId));

        // Validate client timezone
        if (!TimezoneUtils.isValidTimezone(clientTimezone)) {
            throw new BadRequestException("Invalid client timezone: " + clientTimezone);
        }

        ZoneId expertZone = trainer.getZoneId();  // Expert's timezone from User entity
        ZoneId clientZone = ZoneId.of(clientTimezone);

        log.debug("Generating slots for trainer {} in timezone {}, converting to client timezone {}",
                  trainerId, expertZone, clientZone);

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
                // Minute-based walk (LocalTime would wrap past midnight and
                // never terminate for windows ending late in the day).
                int startMinute = avail.getStartTime().get(ChronoField.MINUTE_OF_DAY);
                int endMinute = avail.getEndTime().get(ChronoField.MINUTE_OF_DAY);
                for (int minute = startMinute; minute + 45 <= endMinute; minute += 50) {
                    LocalTime current = LocalTime.of(minute / 60, minute % 60);
                    // Skip local times that don't exist in the expert zone (DST gap)
                    if (TimezoneUtils.timeExists(expertDate, current, expertZone)) {
                        potentialSlotInstants.add(TimezoneUtils.toInstant(expertDate, current, expertZone));
                    }
                }
            }
        }

        // Fetch bookings that could collide with slots on this client day
        List<Booking> bookings = getBookingsForRange(trainerId, clientDayStart, clientDayEnd);

        // Keep only future slots that start on the client's picked day and
        // aren't taken (same overlap rule as booking creation); drop
        // duplicates caused by overlapping/contained windows.
        List<Instant> availableInstants = potentialSlotInstants.stream()
            .filter(slot -> !slot.isBefore(now))
            .filter(slot -> !slot.isBefore(clientDayStart) && slot.isBefore(clientDayEnd))
            .filter(slot -> !isSlotBooked(slot, bookings))
            .distinct()
            .sorted()
            .toList();

        // Convert to DTOs with timezone information
        return availableInstants.stream()
            .map(instant -> buildSlotDto(instant, expertZone, clientZone))
            .toList();
    }

    /** Expert-local dates spanned by the half-open instant range [start, end). */
    private List<LocalDate> expertDatesBetween(Instant start, Instant end, ZoneId expertZone) {
        LocalDate first = start.atZone(expertZone).toLocalDate();
        LocalDate last = end.atZone(expertZone).toLocalDate();
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
    private List<Booking> getBookingsForRange(Long trainerId, Instant start, Instant end) {
        return bookingRepository.findConflictingBookings(
            trainerId,
            start.minus(Duration.ofMinutes(45)),
            end.plus(Duration.ofMinutes(45)));
    }

    /**
     * A slot is blocked iff it collides with a PENDING/CONFIRMED booking
     * under the same ±5-minute-buffered interval-overlap rule the booking
     * creation check uses.
     */
    private boolean isSlotBooked(Instant slotStart, List<Booking> bookings) {
        Instant slotEnd = slotStart.plus(Duration.ofMinutes(45));
        Instant bufferStart = slotStart.minus(Duration.ofMinutes(5));
        Instant bufferEnd = slotEnd.plus(Duration.ofMinutes(5));
        return bookings.stream()
            .anyMatch(b -> b.getStartTime().isBefore(bufferEnd)
                        && b.getEndTime().isAfter(bufferStart));
    }

    /**
     * Build AvailableSlotDto with complete timezone context
     */
    private AvailableSlotDto buildSlotDto(Instant instant, ZoneId expertZone, ZoneId clientZone) {
        // Convert instant to expert's local time
        ZonedDateTime expertTime = TimezoneUtils.toZonedDateTime(instant, expertZone);
        
        // Convert instant to client's local time
        ZonedDateTime clientTime = TimezoneUtils.toZonedDateTime(instant, clientZone);
        
        return AvailableSlotDto.builder()
            .startTime(instant)
            .endTime(instant.plus(45, ChronoUnit.MINUTES))
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
