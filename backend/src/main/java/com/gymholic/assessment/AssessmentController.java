package com.gymholic.assessment;

import com.gymholic.assessment.dto.*;
import com.gymholic.common.response.ApiResponse;
import com.gymholic.common.response.PagedResponse;
import com.gymholic.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/assessments")
@RequiredArgsConstructor
public class AssessmentController {

    private final AssessmentService assessmentService;

    @PostMapping
    public ResponseEntity<ApiResponse<AssessmentResponse>> startAssessment(
            @Valid @RequestBody StartAssessmentRequest request) {
        // Since it's guest-friendly, we leave userId null for now
        // Later we can resolve it via email if the user is logged in
        Long currentUserId = null;
        
        AssessmentResponse response = assessmentService.startAssessment(request, currentUserId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Assessment started successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AssessmentResponse>> updateAssessment(
            @PathVariable UUID id,
            @RequestBody UpdateAssessmentRequest request) {
        AssessmentResponse response = assessmentService.updateAssessment(id, request);
        return ResponseEntity.ok(ApiResponse.success("Assessment updated successfully", response));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<AssessmentResponse>> submitAssessment(
            @PathVariable UUID id,
            @Valid @RequestBody SubmitAssessmentRequest request) {
        AssessmentResponse response = assessmentService.submitAssessment(id, request);
        return ResponseEntity.ok(ApiResponse.success("Assessment submitted successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AssessmentResponse>> getAssessment(@PathVariable UUID id) {
        AssessmentResponse response = assessmentService.getAssessment(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PagedResponse<AssessmentResponse>>> getAllAssessments(Pageable pageable) {
        Page<AssessmentResponse> assessments = assessmentService.getAllAssessments(pageable);

        PagedResponse<AssessmentResponse> pagedResponse = PagedResponse.<AssessmentResponse>builder()
                .content(assessments.getContent())
                .page(assessments.getNumber())
                .size(assessments.getSize())
                .totalElements(assessments.getTotalElements())
                .totalPages(assessments.getTotalPages())
                .last(assessments.isLast())
                .build();

        return ResponseEntity.ok(ApiResponse.success(pagedResponse));
    }
}
