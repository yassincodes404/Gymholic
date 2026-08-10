package com.gymholic.booking;

import com.gymholic.availability.AvailabilityRepository;
import com.gymholic.availability.entity.Availability;
import com.gymholic.booking.dto.BookingDto;
import com.gymholic.booking.dto.CreateBookingRequest;
import com.gymholic.booking.dto.RescheduleBookingRequest;
import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.BookingStatus;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.gymholic.calendar.CalendarService;
import com.gymholic.calendar.dto.CalendarEventDto;
import java.time.*;
import java.util.List;
import com.gymholic.notification.NotificationService;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final AvailabilityRepository availabilityRepository;
    private final CalendarService calendarService;
    private final NotificationService notificationService;

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
        
        long durationMinutes = Duration.between(request.getStartTime(), request.getEndTime()).toMinutes();
        if (durationMinutes != 45) {
            throw new BadRequestException("Consultation duration must be exactly 45 minutes");
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

        // Check for conflicting bookings (using Instant comparison with 5-minute buffer)
        Instant bufferStart = request.getStartTime().minus(Duration.ofMinutes(5));
        Instant bufferEnd = request.getEndTime().plus(Duration.ofMinutes(5));
        
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                request.getTrainerId(), 
                bufferStart, 
                bufferEnd
        );
        
        boolean hasConflict = conflicts.stream()
            .anyMatch(b -> b.getStatus() != BookingStatus.CANCELLED);
            
        if (hasConflict) {
            throw new BadRequestException("The requested time slot is not available due to conflicts");
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
            .status(BookingStatus.PENDING)
            .build();

        Booking saved = bookingRepository.save(booking);
        log.info("Booking created: ID={}, startTime={} (expert: {}, client: {})", 
                 saved.getId(), saved.getStartTime(), expertZone, clientZone);
        
        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public BookingDto getBookingById(Long id) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));
        return mapToDto(booking);
    }

    @Transactional(readOnly = true)
    public Page<BookingDto> getBookingsByClient(Long clientId, Pageable pageable) {
        return bookingRepository.findByClientId(clientId, pageable).map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public Page<BookingDto> getBookingsByTrainer(Long trainerId, Pageable pageable) {
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
        
        // Generate Calendar Event and Meet Link
        // Convert Instant to LocalDateTime in expert's timezone for Calendar API
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
        
        String meetLink = event.getMeetLink(); // Use real Meet link from Google Calendar
        booking.setMeetLink(meetLink);
        booking.setExternalEventId(event.getEventId());
        
        Booking saved = bookingRepository.save(booking);

        notificationService.sendBookingConfirmation(
            saved.getClient().getEmail(),
            saved.getClient().getFirstName(),
            saved.getTrainer().getFirstName(),
            saved.getStartTime().toString(),
            "45",
            saved.getMeetLink()
        );

        return mapToDto(saved);
    }

    @Transactional
    public BookingDto cancelBooking(Long id, String reason) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            // Idempotent
            return mapToDto(booking);
        }

        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Only pending or confirmed bookings can be cancelled");
        }

        BookingStatus oldStatus = booking.getStatus();
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancellationReason(reason);
        
        Booking saved = bookingRepository.save(booking);

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
            saved.getStartTime().toString(), 
            reason
        );

        return mapToDto(saved);
    }

    @Transactional
    public BookingDto rescheduleBooking(Long id, RescheduleBookingRequest request) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));

        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException("Only pending or confirmed bookings can be rescheduled");
        }

        if (request.getNewEndTime().isBefore(request.getNewStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }

        long durationMinutes = Duration.between(request.getNewStartTime(), request.getNewEndTime()).toMinutes();
        if (durationMinutes != 45) {
            throw new BadRequestException("Consultation duration must be exactly 45 minutes");
        }

        // Get expert timezone and convert instant to local time for availability check
        ZoneId expertZone = booking.getTrainer().getZoneId();
        ZonedDateTime startInExpertTz = request.getNewStartTime().atZone(expertZone);
        ZonedDateTime endInExpertTz = request.getNewEndTime().atZone(expertZone);

        // Check if within availability
        DayOfWeek dayOfWeek = startInExpertTz.getDayOfWeek();
        List<Availability> availabilities = availabilityRepository.findByTrainerId(booking.getTrainer().getId());
        
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

        // Check for conflicting bookings (using Instant with buffer)
        Instant bufferStart = request.getNewStartTime().minus(Duration.ofMinutes(5));
        Instant bufferEnd = request.getNewEndTime().plus(Duration.ofMinutes(5));
        
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                booking.getTrainer().getId(), 
                bufferStart, 
                bufferEnd
        );
        
        boolean hasConflict = conflicts.stream()
            .anyMatch(b -> b.getStatus() != BookingStatus.CANCELLED && !b.getId().equals(booking.getId()));
            
        if (hasConflict) {
            throw new BadRequestException("The requested time slot is not available due to conflicts");
        }

        Instant oldStartTime = booking.getStartTime();
        booking.setStartTime(request.getNewStartTime());
        booking.setEndTime(request.getNewEndTime());

        Booking saved = bookingRepository.save(booking);

        if (saved.getStatus() == BookingStatus.CONFIRMED && saved.getExternalEventId() != null) {
            try {
                // Convert to expert's local time for Calendar API
                LocalDateTime newStartInExpertTz = LocalDateTime.ofInstant(saved.getStartTime(), expertZone);
                LocalDateTime newEndInExpertTz = LocalDateTime.ofInstant(saved.getEndTime(), expertZone);
                
                calendarService.updateEvent(
                    saved.getTrainer().getId(), 
                    saved.getExternalEventId(), 
                    null, 
                    null, 
                    newStartInExpertTz, 
                    newEndInExpertTz
                );
            } catch (Exception e) {
                System.err.println("Failed to update Google Calendar event: " + e.getMessage());
            }
        }
        
        notificationService.sendBookingRescheduled(
            saved.getClient().getEmail(),
            saved.getClient().getFirstName(),
            saved.getTrainer().getFirstName(),
            oldStartTime.toString(),
            saved.getStartTime().toString(),
            saved.getMeetLink()
        );

        return mapToDto(saved);
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
            .assessmentId(booking.getAssessmentId())
            .notes(booking.getNotes())
            .meetLink(booking.getMeetLink())
            .externalEventId(booking.getExternalEventId())
            .createdAt(booking.getCreatedAt())
            .build();
    }
}
