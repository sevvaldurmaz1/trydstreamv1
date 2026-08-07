package com.traydstream.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class DiscrepancyReportResponse {

    private Long id;
    private Long mtMessageId;
    private String mtReference;
    private Long documentId;
    private String documentFileName;
    private String overallResult;       // CLEAN | DISCREPANT | PENDING
    private int totalFindings;
    private int mandatoryFindings;
    private int optionalFindings;
    private Instant checkedAt;
    private String notes;
    private boolean aiAvailable;
    private List<FindingDto> findings;

    @Data
    @Builder
    public static class FindingDto {
        private Long id;
        private String ruleCode;
        private String findingType;     // R | O
        private String severity;        // HIGH | MEDIUM | LOW
        private String fieldName;
        private String mtValue;
        private String documentValue;
        private String description;
        private String aiExplanation;
        private String isbpReference;
        private String ucpReference;
        private boolean isWaived;
    }
}
