package com.traydstream.service;

import com.traydstream.entity.Document;
import com.traydstream.entity.ValidationIssue;
import com.traydstream.entity.ValidationResult;
import com.traydstream.repository.DocumentRepository;
import com.traydstream.repository.ValidationResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private static final byte[] UTF8_BOM = new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm").withZone(ZoneId.systemDefault());

    private final DocumentRepository documentRepository;
    private final ValidationResultRepository validationResultRepository;

    @Transactional(readOnly = true)
    public byte[] generateProcessingHistoryCsv() {
        List<Document> documents = documentRepository.findAll(Sort.by(Sort.Direction.DESC, "uploadedAt"));

        StringBuilder sb = new StringBuilder();
        appendRow(sb, "ID", "Dosya Adı", "Durum", "Yükleyen", "Yüklenme Tarihi", "İşlenme Tarihi", "Çıkarılan Alan Sayısı");

        for (Document d : documents) {
            appendRow(sb,
                    String.valueOf(d.getId()),
                    d.getFileName(),
                    d.getStatus().name(),
                    d.getUploadedBy() != null ? d.getUploadedBy().getEmail() : "",
                    d.getUploadedAt() != null ? DATE_FMT.format(d.getUploadedAt()) : "",
                    d.getProcessedAt() != null ? DATE_FMT.format(d.getProcessedAt()) : "",
                    String.valueOf(d.getExtractedFieldCount() != null ? d.getExtractedFieldCount() : 0)
            );
        }

        return toBytes(sb);
    }

    @Transactional(readOnly = true)
    public byte[] generateValidationReportCsv() {
        List<ValidationResult> results = validationResultRepository.findAll(Sort.by(Sort.Direction.DESC, "validatedAt"));

        StringBuilder sb = new StringBuilder();
        appendRow(sb, "Belge ID", "Dosya Adı", "Genel Sonuç", "Güven Puanı", "Doğrulama Tarihi",
                "Yüksek Sorun", "Orta Sorun", "Düşük Sorun", "Notlar");

        for (ValidationResult vr : results) {
            long high = countBySeverity(vr.getIssues(), "HIGH");
            long medium = countBySeverity(vr.getIssues(), "MEDIUM");
            long low = countBySeverity(vr.getIssues(), "LOW");

            appendRow(sb,
                    String.valueOf(vr.getDocument().getId()),
                    vr.getDocument().getFileName(),
                    vr.getOverallStatus().name(),
                    vr.getConfidenceScore() + "%",
                    vr.getValidatedAt() != null ? DATE_FMT.format(vr.getValidatedAt()) : "",
                    String.valueOf(high),
                    String.valueOf(medium),
                    String.valueOf(low),
                    vr.getNotes() != null ? vr.getNotes() : ""
            );
        }

        return toBytes(sb);
    }

    private long countBySeverity(List<ValidationIssue> issues, String severity) {
        return issues.stream().filter(i -> severity.equals(i.getSeverity())).count();
    }

    private void appendRow(StringBuilder sb, String... cols) {
        for (int i = 0; i < cols.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(escapeCsv(cols[i]));
        }
        sb.append("\r\n");
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        boolean needsQuoting = value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r");
        String escaped = value.replace("\"", "\"\"");
        return needsQuoting ? "\"" + escaped + "\"" : escaped;
    }

    private byte[] toBytes(StringBuilder sb) {
        byte[] content = sb.toString().getBytes(StandardCharsets.UTF_8);
        byte[] result = new byte[UTF8_BOM.length + content.length];
        System.arraycopy(UTF8_BOM, 0, result, 0, UTF8_BOM.length);
        System.arraycopy(content, 0, result, UTF8_BOM.length, content.length);
        return result;
    }
}
