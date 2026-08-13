package com.traydstream.service;

import com.traydstream.dto.request.DiscrepancyCheckRequest;
import com.traydstream.dto.response.DiscrepancyReportResponse;
import com.traydstream.entity.*;
import com.traydstream.exception.AppException;
import com.traydstream.repository.DiscrepancyReportRepository;
import com.traydstream.repository.DocumentRepository;
import com.traydstream.repository.ExtractedFieldRepository;
import com.traydstream.repository.MtMessageRepository;
import com.traydstream.repository.UserRepository;
import com.traydstream.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DiscrepancyService {

    private final DiscrepancyReportRepository reportRepository;
    private final MtMessageRepository mtMessageRepository;
    private final DocumentRepository documentRepository;
    private final ExtractedFieldRepository extractedFieldRepository;
    private final UserRepository userRepository;
    private final WebClient.Builder webClientBuilder;

    @Value("${app.ai-service-url}")
    private String aiServiceUrl;

    // ── Aykırılık Kontrolü ────────────────────────────────────────────────────

    @Transactional
    public DiscrepancyReportResponse checkDiscrepancy(DiscrepancyCheckRequest req) {
        User user = getCurrentUser();

        // MT mesajını al
        MtMessage mt = mtMessageRepository.findById(req.getMtId())
                .orElseThrow(() -> new AppException("MT mesajı bulunamadı: " + req.getMtId(), HttpStatus.NOT_FOUND));

        // Belgeyi al
        Document doc = documentRepository.findById(req.getDocumentId())
                .orElseThrow(() -> new AppException("Belge bulunamadı: " + req.getDocumentId(), HttpStatus.NOT_FOUND));

        // Belgeden çıkarılmış alanları al (field_name → field_value)
        Map<String, String> invoiceFields = new HashMap<>();
        extractedFieldRepository.findByDocumentId(doc.getId()).forEach(f -> {
            String value = f.getIsCorrected() != null && f.getIsCorrected() && f.getCorrectedValue() != null
                    ? f.getCorrectedValue()
                    : f.getFieldValue();
            if (value != null) {
                invoiceFields.put(f.getFieldName(), value);
            }
        });

        // AI servisini çağır
        Map<String, Object> aiResult = callAiDiscrepancyCheck(
                mt.getRawText(),
                invoiceFields,
                req.getDocumentType(),
                req.isUseAi()
        );

        // Rapor oluştur
        DiscrepancyReport report = DiscrepancyReport.builder()
                .user(user)
                .mtMessage(mt)
                .document(doc)
                .overallResult((String) aiResult.getOrDefault("overall_result", "PENDING"))
                .totalFindings(getInt(aiResult, "total_findings"))
                .mandatoryFindings(getInt(aiResult, "mandatory_findings"))
                .optionalFindings(getInt(aiResult, "optional_findings"))
                .notes((String) aiResult.get("notes"))
                .build();

        // Bulguları kaydet
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rawFindings = (List<Map<String, Object>>) aiResult.getOrDefault("findings", List.of());
        for (Map<String, Object> f : rawFindings) {
            DiscrepancyFinding finding = DiscrepancyFinding.builder()
                    .report(report)
                    .ruleCode(getString(f, "rule_code"))
                    .findingType(getString(f, "finding_type"))
                    .fieldName(getString(f, "field_name"))
                    .mtValue(getString(f, "mt_value"))
                    .documentValue(getString(f, "document_value"))
                    .description(getString(f, "description"))
                    .aiExplanation(getString(f, "ai_explanation"))
                    .isbpReference(getString(f, "isbp_reference"))
                    .ucpReference(getString(f, "ucp_reference"))
                    .build();
            report.getFindings().add(finding);
        }

        report = reportRepository.save(report);
        log.info("Aykırılık raporu kaydedildi: id={}, sonuç={}, bulgular={}",
                report.getId(), report.getOverallResult(), report.getTotalFindings());

        boolean aiAvailable = Boolean.TRUE.equals(aiResult.get("ai_available"));
        return toResponse(report, aiAvailable);
    }

    // ── Listeleme ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<DiscrepancyReportResponse> listForCurrentUser() {
        User user = getCurrentUser();
        return reportRepository.findByUserIdOrderByCheckedAtDesc(user.getId())
                .stream()
                .map(r -> toResponse(r, false))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DiscrepancyReportResponse getById(Long id) {
        DiscrepancyReport report = reportRepository.findById(id)
                .orElseThrow(() -> new AppException("Aykırılık raporu bulunamadı: " + id, HttpStatus.NOT_FOUND));
        return toResponse(report, false);
    }

    @Transactional(readOnly = true)
    public List<DiscrepancyReportResponse> listByMtMessage(Long mtMessageId) {
        return reportRepository.findByMtMessageIdOrderByCheckedAtDesc(mtMessageId)
                .stream()
                .map(r -> toResponse(r, false))
                .collect(Collectors.toList());
    }

    // ── AI Servis Çağrısı ─────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> callAiDiscrepancyCheck(
            String rawText,
            Map<String, String> invoiceFields,
            String documentType,
            boolean useAi
    ) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("mt_raw_text", rawText);
            body.put("invoice_fields", invoiceFields);
            body.put("document_type", documentType);
            body.put("use_ai", useAi);

            return webClientBuilder.build()
                    .post()
                    .uri(aiServiceUrl + "/discrepancy/check-with-fields")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            log.error("AI servisi aykırılık kontrolü hatası: {}", e.getMessage());
            throw new AppException("AI servisi kullanılamıyor: " + e.getMessage(), HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    // ── Yardımcılar ───────────────────────────────────────────────────────────

    private User getCurrentUser() {
        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new AppException("Kullanıcı bulunamadı", HttpStatus.UNAUTHORIZED));
    }

    private String getString(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v != null ? v.toString() : null;
    }

    private int getInt(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return 0;
        try { return ((Number) v).intValue(); } catch (Exception e) { return 0; }
    }

    private DiscrepancyReportResponse toResponse(DiscrepancyReport r, boolean aiAvailable) {
        List<DiscrepancyReportResponse.FindingDto> findingDtos = r.getFindings().stream()
                .map(f -> DiscrepancyReportResponse.FindingDto.builder()
                        .id(f.getId())
                        .ruleCode(f.getRuleCode())
                        .findingType(f.getFindingType())
                        .fieldName(f.getFieldName())
                        .mtValue(f.getMtValue())
                        .documentValue(f.getDocumentValue())
                        .description(f.getDescription())
                        .aiExplanation(f.getAiExplanation())
                        .isbpReference(f.getIsbpReference())
                        .ucpReference(f.getUcpReference())
                        .isWaived(Boolean.TRUE.equals(f.getIsWaived()))
                        .build())
                .collect(Collectors.toList());

        return DiscrepancyReportResponse.builder()
                .id(r.getId())
                .mtMessageId(r.getMtMessage().getId())
                .mtReference(r.getMtMessage().getReferenceNumber())
                .documentId(r.getDocument().getId())
                .documentFileName(r.getDocument().getFileName())
                .overallResult(r.getOverallResult())
                .totalFindings(r.getTotalFindings())
                .mandatoryFindings(r.getMandatoryFindings())
                .optionalFindings(r.getOptionalFindings())
                .checkedAt(r.getCheckedAt())
                .notes(r.getNotes())
                .aiAvailable(aiAvailable)
                .findings(findingDtos)
                .build();
    }
}
