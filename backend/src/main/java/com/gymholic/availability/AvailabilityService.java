package com.gymholic.availability;

import com.gymholic.availability.dto.AvailabilityDto;
import com.gymholic.availability.dto.AvailableSlotDto;
import com.gymholic.availability.dto.CreateAvailabilityRequest;
import com.gymholic.availability.entity.Availability;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.common.util.TimezoneUtils;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gymholic.booking.BookingRepository;
import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.BookingStatus;
import java.time.*;
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

        if (request.getEndTime().isBefore(request.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
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
     * Get available consultation slots for a trainer on a specific date,
     * converted to the client's timezone.
     * 
     * This method:
     * 1. Gets expert's timezone from User entity
     * 2. Validates client timezone
     * 3. Generates slots in expert's timezone
     * 4. Converts each slot to client's timezone
     * 5. Filters out booked slots
     * 6. Returns slots with complete timezone context
     * 
     * @param trainerId The expert/trainer ID
     * @param date The date to check availability
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
        
        // Find matching availabilities for the date
        List<Availability> availabilities = availabilityRepository.findByTrainerId(trainerId).stream()
            .filter(a -> {
                if (a.isRecurring()) {
                    return a.getDayOfWeek() == date.getDayOfWeek();
                } else {
                    return date.equals(a.getSpecificDate());
                }
            })
            .toList();

        if (availabilities.isEmpty()) {
            log.debug("No availability found for trainer {} on {}", trainerId, date);
            return List.of();
        }

        // Generate potential slots in EXPERT's timezone
        List<Instant> potentialSlotInstants = new ArrayList<>();
        
        for (Availability avail : availabilities) {
            LocalTime current = avail.getStartTime();
            
            while (!current.plusMinutes(45).isAfter(avail.getEndTime())) {
                // Convert expert's local time to UTC instant
                Instant slotInstant = TimezoneUtils.toInstant(date, current, expertZone);
                potentialSlotInstants.add(slotInstant);
                
                current = current.plusMinutes(50); // 45 min consultation + 5 min buffer
            }
        }

        // Fetch booked slots for the date
        List<Instant> bookedInstants = getBookedSlotsForDate(trainerId, date, expertZone);

        // Filter out booked slots (considering 5-minute buffer)
        List<Instant> availableInstants = potentialSlotInstants.stream()
            .filter(slot -> !isSlotBooked(slot, bookedInstants))
            .sorted()
            .toList();

        // Convert to DTOs with timezone information
        return availableInstants.stream()
            .map(instant -> buildSlotDto(instant, expertZone, clientZone))
            .toList();
    }

    /**
     * Get booked slot instants for a specific date
     */
    private List<Instant> getBookedSlotsForDate(Long trainerId, LocalDate date, ZoneId expertZone) {
        // Get start and end of day in expert's timezone
        Instant startOfDay = TimezoneUtils.toInstant(date, LocalTime.MIN, expertZone);
        Instant endOfDay = TimezoneUtils.toInstant(date.plusDays(1), LocalTime.MIN, expertZone);

        return bookingRepository.findAll().stream()
            .filter(b -> b.getTrainer().getId().equals(trainerId))
            .filter(b -> b.getStatus() == BookingStatus.PENDING || b.getStatus() == BookingStatus.CONFIRMED)
            .filter(b -> !b.getStartTime().isBefore(startOfDay) && b.getStartTime().isBefore(endOfDay))
            .map(Booking::getStartTime)
            .toList();
    }

    /**
     * Check if a slot is booked (considering 5-minute buffer)
     */
    private boolean isSlotBooked(Instant slot, List<Instant> bookedInstants) {
        return bookedInstants.stream()
            .anyMatch(booked -> {
                long minutesApart = Math.abs(Duration.between(slot, booked).toMinutes());
                return minutesApart < 45;  // Slots overlap if less than 45 minutes apart
            });
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
        if (!availabilityRepository.existsById(id)) {
            throw new ResourceNotFoundException("Availability", "id", id);
        }
        availabilityRepository.deleteById(id);
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
