package com.traydstream.service;

import com.traydstream.dto.response.DocumentResponse;
import com.traydstream.dto.response.DocumentTypeResponse;
import com.traydstream.dto.response.ExtractedFieldResponse;
import com.traydstream.dto.response.PagedResponse;
import com.traydstream.dto.response.ValidationIssueResponse;
import com.traydstream.dto.response.ValidationResultResponse;
import com.traydstream.entity.Document;
import com.traydstream.entity.DocumentType;
import com.traydstream.entity.ExtractedField;
import com.traydstream.entity.User;
import com.traydstream.entity.ValidationIssue;
import com.traydstream.entity.ValidationResult;
import com.traydstream.entity.enums.DocumentStatus;
import com.traydstream.entity.enums.ValidationStatus;
import com.traydstream.exception.AppException;
import com.traydstream.repository.DocumentRepository;
import com.traydstream.repository.DocumentTypeRepository;
import com.traydstream.repository.ExtractedFieldRepository;
import com.traydstream.repository.UserRepository;
import com.traydstream.repository.ValidationResultRepository;
import com.traydstream.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final UserRepository userRepository;
    private final ExtractedFieldRepository extractedFieldRepository;
    private final ValidationResultRepository validationResultRepository;
    private final WebClient.Builder webClientBuilder;

    @Value("${app.upload-dir}")
    private String uploadDir;

    @Value("${app.ai-service-url}")
    private String aiServiceUrl;

    // ── Yükleme ───────────────────────────────────────────────────────────────

    @Transactional
    public DocumentResponse upload(MultipartFile file, Long documentTypeId) {
        if (file == null || file.isEmpty()) {
            throw new AppException("Yüklenecek dosya boş olamaz", HttpStatus.BAD_REQUEST);
        }

        User user = getCurrentUser();

        DocumentType documentType = null;
        if (documentTypeId != null) {
            documentType = documentTypeRepository.findById(documentTypeId)
                    .orElseThrow(() -> new AppException("Belge tipi bulunamadı: " + documentTypeId, HttpStatus.NOT_FOUND));
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        String extension = "";
        int dotIdx = originalName.lastIndexOf('.');
        if (dotIdx >= 0) {
            extension = originalName.substring(dotIdx);
        }
        String storedName = UUID.randomUUID() + extension;

        try {
            Path dir = Paths.get(uploadDir);
            Files.createDirectories(dir);
            Path destination = dir.resolve(storedName);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

            Document document = Document.builder()
                    .uploadedBy(user)
                    .documentType(documentType)
                    .fileName(originalName)
                    .filePath(destination.toString())
                    .fileSize(file.getSize())
                    .mimeType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                    .status(DocumentStatus.UPLOADED)
                    .build();

            document = documentRepository.save(document);
            log.info("Belge yüklendi: id={}, dosya={}", document.getId(), originalName);

            try {
                document = runOcr(document);
            } catch (Exception e) {
                log.error("OCR işlenemedi, belge UPLOADED durumunda kalacak: id={}, hata={}", document.getId(), e.getMessage());
            }

            return toResponse(document);
        } catch (IOException e) {
            log.error("Belge kaydedilemedi: {}", e.getMessage(), e);
            throw new AppException("Belge kaydedilemedi: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Transactional(readOnly = true)
    public PagedResponse<DocumentResponse> list(String search, DocumentStatus status, Pageable pageable) {
        Page<Document> page = documentRepository.findAllWithFilters(search, status, pageable);
        return PagedResponse.from(page.map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public DocumentResponse getById(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new AppException("Belge bulunamadı: " + id, HttpStatus.NOT_FOUND));
        return toResponse(document);
    }

    // ── OCR / Alan Çıkarma ───────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Document runOcr(Document document) {
        Map<String, Object> body = new HashMap<>();
        body.put("document_id", document.getId());
        body.put("file_path", document.getFilePath());
        body.put("mime_type", document.getMimeType());
        if (document.getDocumentType() != null) {
            body.put("document_type_code", document.getDocumentType().getCode());
        }

        Map<String, Object> result;
        try {
            result = webClientBuilder.build()
                    .post()
                    .uri(aiServiceUrl + "/ocr/process")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                            response -> response.bodyToMono(String.class).map(respBody -> {
                                log.error("AI servisi OCR hata yanıtı [{}]: {}", response.statusCode(), respBody);
                                return new RuntimeException("AI servisi [" + response.statusCode() + "]: " + respBody);
                            }))
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            throw new AppException("OCR servisi kullanılamıyor: " + e.getMessage(), HttpStatus.SERVICE_UNAVAILABLE);
        }

        if (result == null) {
            throw new AppException("OCR servisi geçersiz yanıt döndürdü (boş gövde)", HttpStatus.BAD_GATEWAY);
        }

        List<Map<String, Object>> rawFields = (List<Map<String, Object>>) result.getOrDefault("extracted_fields", List.of());
        Document parentDocument = document;
        List<ExtractedField> fields = rawFields.stream()
                .map(f -> ExtractedField.builder()
                        .document(parentDocument)
                        .fieldName((String) f.get("field_name"))
                        .fieldValue((String) f.get("field_value"))
                        .confidenceScore(toBigDecimal(f.get("confidence_score")))
                        .build())
                .collect(Collectors.toList());
        extractedFieldRepository.saveAll(fields);

        long populatedCount = fields.stream().filter(f -> f.getFieldValue() != null && !f.getFieldValue().isBlank()).count();

        document.setExtractedFieldCount((int) populatedCount);
        document.setStatus(DocumentStatus.EXTRACTED);
        document.setProcessedAt(Instant.now());
        document = documentRepository.save(document);

        log.info("Belge OCR ile işlendi: id={}, alan={}", document.getId(), populatedCount);
        return document;
    }

    // ── Çıkarılan Alanlar ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ExtractedFieldResponse> getExtractedFields(Long documentId) {
        ensureDocumentExists(documentId);
        return extractedFieldRepository.findByDocumentId(documentId).stream()
                .map(this::toFieldResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ExtractedFieldResponse correctField(Long documentId, Long fieldId, String correctedValue) {
        ExtractedField field = extractedFieldRepository.findById(fieldId)
                .orElseThrow(() -> new AppException("Alan bulunamadı: " + fieldId, HttpStatus.NOT_FOUND));

        if (!field.getDocument().getId().equals(documentId)) {
            throw new AppException("Alan bu belgeye ait değil: " + fieldId, HttpStatus.BAD_REQUEST);
        }

        field.setCorrectedValue(correctedValue);
        field.setIsCorrected(true);
        field.setIsValidated(true);
        field.setConfidenceScore(BigDecimal.ONE);
        field = extractedFieldRepository.save(field);

        return toFieldResponse(field);
    }

    // ── Doğrulama ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ValidationResultResponse getValidation(Long documentId) {
        ensureDocumentExists(documentId);
        return validationResultRepository.findByDocumentId(documentId)
                .map(this::toValidationResponse)
                .orElse(null);
    }

    @SuppressWarnings("unchecked")
    @Transactional
    public ValidationResultResponse validate(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new AppException("Belge bulunamadı: " + documentId, HttpStatus.NOT_FOUND));

        List<ExtractedField> fields = extractedFieldRepository.findByDocumentId(documentId);

        Map<String, Object> body = new HashMap<>();
        body.put("document_id", documentId);
        body.put("fields", fields.stream().map(f -> {
            Map<String, Object> f2 = new HashMap<>();
            f2.put("field_name", f.getFieldName());
            f2.put("field_value", Boolean.TRUE.equals(f.getIsCorrected()) && f.getCorrectedValue() != null
                    ? f.getCorrectedValue() : f.getFieldValue());
            f2.put("confidence_score", f.getConfidenceScore());
            return f2;
        }).collect(Collectors.toList()));

        Map<String, Object> result;
        try {
            result = webClientBuilder.build()
                    .post()
                    .uri(aiServiceUrl + "/validation/validate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                            response -> response.bodyToMono(String.class).map(respBody -> {
                                log.error("AI servisi doğrulama hata yanıtı [{}]: {}", response.statusCode(), respBody);
                                return new RuntimeException("AI servisi [" + response.statusCode() + "]: " + respBody);
                            }))
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            throw new AppException("Doğrulama servisi kullanılamıyor: " + e.getMessage(), HttpStatus.SERVICE_UNAVAILABLE);
        }

        if (result == null) {
            throw new AppException("Doğrulama servisi geçersiz yanıt döndürdü (boş gövde)", HttpStatus.BAD_GATEWAY);
        }

        ValidationResult vr = validationResultRepository.findByDocumentId(documentId)
                .orElseGet(() -> ValidationResult.builder().document(document).build());

        vr.setOverallStatus(ValidationStatus.valueOf((String) result.get("overall_status")));
        vr.setConfidenceScore(((Number) result.getOrDefault("confidence_score", 0)).intValue());
        vr.setNotes((String) result.get("notes"));
        vr.setValidatedAt(Instant.now());

        vr.getIssues().clear();
        List<Map<String, Object>> rawIssues = (List<Map<String, Object>>) result.getOrDefault("issues", List.of());
        for (Map<String, Object> ri : rawIssues) {
            ValidationIssue issue = ValidationIssue.builder()
                    .validationResult(vr)
                    .issueType((String) ri.get("issue_type"))
                    .severity((String) ri.get("severity"))
                    .fieldName((String) ri.get("field_name"))
                    .description((String) ri.get("description"))
                    .createdAt(Instant.now())
                    .build();
            vr.getIssues().add(issue);
        }

        vr = validationResultRepository.save(vr);

        document.setStatus(mapDocumentStatus(vr.getOverallStatus()));
        documentRepository.save(document);

        log.info("Belge doğrulandı: id={}, sonuç={}, puan={}", documentId, vr.getOverallStatus(), vr.getConfidenceScore());

        return toValidationResponse(vr);
    }

    private DocumentStatus mapDocumentStatus(ValidationStatus status) {
        return switch (status) {
            case PASSED -> DocumentStatus.VALIDATED;
            case WARNING, FAILED -> DocumentStatus.REQUIRES_REVIEW;
            case PENDING -> DocumentStatus.VALIDATING;
        };
    }

    // ── Yardımcılar ───────────────────────────────────────────────────────────

    private void ensureDocumentExists(Long documentId) {
        if (!documentRepository.existsById(documentId)) {
            throw new AppException("Belge bulunamadı: " + documentId, HttpStatus.NOT_FOUND);
        }
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        try {
            return new BigDecimal(value.toString());
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    private User getCurrentUser() {
        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new AppException("Kullanıcı bulunamadı", HttpStatus.UNAUTHORIZED));
    }

    private DocumentResponse toResponse(Document d) {
        DocumentTypeResponse typeResponse = null;
        if (d.getDocumentType() != null) {
            DocumentType dt = d.getDocumentType();
            typeResponse = DocumentTypeResponse.builder()
                    .id(dt.getId())
                    .name(dt.getName())
                    .code(dt.getCode())
                    .description(dt.getDescription())
                    .build();
        }

        return DocumentResponse.builder()
                .id(d.getId())
                .fileName(d.getFileName())
                .fileSize(d.getFileSize())
                .mimeType(d.getMimeType())
                .status(d.getStatus())
                .documentType(typeResponse)
                .uploadedBy(d.getUploadedBy().getEmail())
                .uploadedAt(d.getUploadedAt())
                .processedAt(d.getProcessedAt())
                .extractedFieldCount(d.getExtractedFieldCount())
                .validationScore(null)
                .build();
    }

    private ExtractedFieldResponse toFieldResponse(ExtractedField f) {
        return ExtractedFieldResponse.builder()
                .id(f.getId())
                .documentId(f.getDocument().getId())
                .fieldName(f.getFieldName())
                .fieldValue(f.getFieldValue())
                .confidenceScore(f.getConfidenceScore())
                .isValidated(f.getIsValidated())
                .isCorrected(f.getIsCorrected())
                .correctedValue(f.getCorrectedValue())
                .build();
    }

    private ValidationResultResponse toValidationResponse(ValidationResult vr) {
        List<ValidationIssueResponse> issues = vr.getIssues().stream()
                .map(i -> ValidationIssueResponse.builder()
                        .id(i.getId())
                        .issueType(i.getIssueType())
                        .severity(i.getSeverity())
                        .fieldName(i.getFieldName())
                        .description(i.getDescription())
                        .isResolved(i.getIsResolved())
                        .build())
                .collect(Collectors.toList());

        return ValidationResultResponse.builder()
                .id(vr.getId())
                .documentId(vr.getDocument().getId())
                .overallStatus(vr.getOverallStatus())
                .confidenceScore(vr.getConfidenceScore())
                .validatedAt(vr.getValidatedAt())
                .notes(vr.getNotes())
                .issues(issues)
                .build();
    }
}
