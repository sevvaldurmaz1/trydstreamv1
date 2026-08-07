package com.traydstream.service;

import com.traydstream.entity.enums.DocumentStatus;
import com.traydstream.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final DocumentRepository documentRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();

        long total = documentRepository.count();
        long processingToday = documentRepository.countUploadedSince(
            Instant.now().truncatedTo(ChronoUnit.DAYS)
        );
        long pendingReview = documentRepository.countByStatus(DocumentStatus.REQUIRES_REVIEW);

        // Status breakdown
        Map<String, Long> statusBreakdown = new HashMap<>();
        for (DocumentStatus s : DocumentStatus.values()) {
            statusBreakdown.put(s.name(), documentRepository.countByStatus(s));
        }

        // Validated vs total for success rate
        long validated = statusBreakdown.getOrDefault("VALIDATED", 0L)
            + statusBreakdown.getOrDefault("COMPLETED", 0L);
        int validationRate = total > 0 ? (int) ((validated * 100) / total) : 0;

        // Placeholder weekly data (replace with real time-series query)
        List<Integer> weekData = List.of(12, 19, 8, 25, 14, 6, 20);

        stats.put("totalDocuments", total);
        stats.put("processingToday", processingToday);
        stats.put("validationSuccessRate", validationRate);
        stats.put("pendingReview", pendingReview);
        stats.put("documentsThisWeek", weekData);
        stats.put("statusBreakdown", statusBreakdown);
        stats.put("recentDocuments", documentRepository.findTop10ByOrderByUploadedAtDesc()
            .stream()
            .map(d -> {
                Map<String, Object> doc = new HashMap<>();
                doc.put("id", d.getId());
                doc.put("fileName", d.getFileName());
                doc.put("fileSize", d.getFileSize());
                doc.put("mimeType", d.getMimeType());
                doc.put("status", d.getStatus().name());
                doc.put("uploadedAt", d.getUploadedAt().toString());
                doc.put("processedAt", d.getProcessedAt() != null ? d.getProcessedAt().toString() : null);
                doc.put("extractedFieldCount", d.getExtractedFieldCount());
                doc.put("validationScore", null); // populated from validation_results join
                return doc;
            })
            .collect(Collectors.toList()));

        return stats;
    }
}
