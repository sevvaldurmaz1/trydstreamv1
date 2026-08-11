package com.traydstream.dto.response;

import com.traydstream.entity.enums.ValidationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidationResultResponse {
    private Long id;
    private Long documentId;
    private ValidationStatus overallStatus;
    private Integer confidenceScore;
    private Instant validatedAt;
    private String notes;
    private List<ValidationIssueResponse> issues;
}
