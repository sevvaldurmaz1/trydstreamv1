package com.traydstream.dto.response;

import com.traydstream.entity.enums.DocumentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentResponse {
    private Long id;
    private String fileName;
    private Long fileSize;
    private String mimeType;
    private DocumentStatus status;
    private DocumentTypeResponse documentType;
    private String uploadedBy;
    private Instant uploadedAt;
    private Instant processedAt;
    private Integer extractedFieldCount;
    private Integer validationScore;
}
