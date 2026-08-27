package com.gymholic.availability;

import com.gymholic.availability.entity.Availability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AvailabilityRepository extends JpaRepository<Availability, Long> {

    List<Availability> findByTrainerId(Long trainerId);

    List<Availability> findByTrainerIdAndRecurringTrue(Long trainerId);

    List<Availability> findByTrainerIdAndDayOfWeek(Long trainerId, DayOfWeek dayOfWeek);

    List<Availability> findByTrainerIdAndSpecificDate(Long trainerId, LocalDate specificDate);

    Optional<Availability> findFirstByOrderByIdDesc();

    boolean existsByTrainerIdAndDayOfWeekAndStartTimeAndEndTimeAndRecurringTrue(
        Long trainerId, DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime);
}
