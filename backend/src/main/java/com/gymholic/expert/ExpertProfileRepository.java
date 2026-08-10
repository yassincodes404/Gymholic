package com.gymholic.expert;

import com.gymholic.expert.entity.ExpertProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExpertProfileRepository extends JpaRepository<ExpertProfile, Long> {
    Optional<ExpertProfile> findByUserId(Long userId);
    boolean existsByUserId(Long userId);
}
