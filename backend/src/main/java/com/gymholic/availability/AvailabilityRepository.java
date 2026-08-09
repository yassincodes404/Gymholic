package com.gymholic.availability;

import com.gymholic.availability.entity.Availability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface AvailabilityRepository extends JpaRepository<Availability, Long> {

    List<Availability> findByTrainerId(Long trainerId);

    List<Availability> findByTrainerIdAndRecurringTrue(Long trainerId);

    List<Availability> findByTrainerIdAndDayOfWeek(Long trainerId, DayOfWeek dayOfWeek);

    List<Availability> findByTrainerIdAndSpecificDate(Long trainerId, LocalDate specificDate);
}
