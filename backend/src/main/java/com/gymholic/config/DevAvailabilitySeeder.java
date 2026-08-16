package com.gymholic.config;

import com.gymholic.availability.AvailabilityRepository;
import com.gymholic.availability.entity.Availability;
import com.gymholic.common.enums.Role;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

/**
 * Dev-only: ensures the default admin/expert has recurring availability
 * (every day 09:00–17:00) so the booking flow can be exercised immediately.
 */
@Configuration
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DevAvailabilitySeeder {

    private final AvailabilityRepository availabilityRepository;
    private final UserRepository userRepository;

    @Bean
    public CommandLineRunner seedDevAvailability() {
        return args -> {
            User expert = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ADMIN || u.getRole() == Role.TRAINER)
                .findFirst()
                .orElse(null);
            if (expert == null) {
                log.info("No admin/trainer user found yet. Skipping dev availability seed.");
                return;
            }
            if (!availabilityRepository.findByTrainerIdAndRecurringTrue(expert.getId()).isEmpty()) {
                log.info("Expert {} already has availability. Skipping seed.", expert.getEmail());
                return;
            }

            for (DayOfWeek day : DayOfWeek.values()) {
                availabilityRepository.save(Availability.builder()
                    .trainer(expert)
                    .dayOfWeek(day)
                    .startTime(LocalTime.of(9, 0))
                    .endTime(LocalTime.of(17, 0))
                    .recurring(true)
                    .build());
            }
            log.info("✓ Seeded default availability (Mon–Sun 09:00–17:00) for {}", expert.getEmail());
        };
    }
}
