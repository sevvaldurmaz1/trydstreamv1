package com.traydstream.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidationIssueResponse {
    private Long id;
    private String issueType;
    private String severity;
    private String fieldName;
    private String description;
    private Boolean isResolved;
}
