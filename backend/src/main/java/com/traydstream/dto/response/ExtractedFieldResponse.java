package com.traydstream.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExtractedFieldResponse {
    private Long id;
    private Long documentId;
    private String fieldName;
    private String fieldValue;
    private BigDecimal confidenceScore;
    private Boolean isValidated;
    private Boolean isCorrected;
    private String correctedValue;
}
