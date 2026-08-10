package com.gymholic.assessment;

import com.gymholic.assessment.entity.Assessment;
import com.gymholic.assessment.enums.AssessmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AssessmentRepository extends JpaRepository<Assessment, UUID> {
    Page<Assessment> findByStatus(AssessmentStatus status, Pageable pageable);
    Page<Assessment> findByUserId(Long userId, Pageable pageable);
}
