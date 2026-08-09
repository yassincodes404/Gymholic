package com.gymholic.availability;

import com.gymholic.availability.dto.AvailabilityDto;
import com.gymholic.availability.dto.CreateAvailabilityRequest;
import com.gymholic.availability.entity.Availability;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AvailabilityService {

    private final AvailabilityRepository availabilityRepository;
    private final UserRepository userRepository;

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
