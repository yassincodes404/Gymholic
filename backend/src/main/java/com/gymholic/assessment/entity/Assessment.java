package com.gymholic.assessment.entity;

import com.gymholic.assessment.enums.*;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "assessments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Assessment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Optional: Only filled if user is logged in
    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_type")
    private UserType userType;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_stage")
    private CurrentStage currentStage;

    @Column(length = 500)
    private String situation;

    @Enumerated(EnumType.STRING)
    @Column(name = "start_timing")
    private StartTiming startTiming;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_consultation")
    private ConsultationType preferredConsultation;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_language")
    private PreferredLanguage preferredLanguage;

    @Column(name = "best_time_to_contact")
    private String bestTimeToContact;
    
    @Column(name = "full_name")
    private String fullName;
    
    @Column(name = "whatsapp")
    private String whatsapp;
    
    @Column(name = "email")
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AssessmentStatus status = AssessmentStatus.DRAFT;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    @Builder.Default
    private Map<String, Object> details = new HashMap<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
