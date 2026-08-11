package com.traydstream.controller;

import com.traydstream.dto.request.CorrectFieldRequest;
import com.traydstream.dto.response.ApiResponse;
import com.traydstream.dto.response.DocumentResponse;
import com.traydstream.dto.response.ExtractedFieldResponse;
import com.traydstream.dto.response.PagedResponse;
import com.traydstream.dto.response.ValidationResultResponse;
import com.traydstream.entity.enums.DocumentStatus;
import com.traydstream.service.DocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    /**
     * Belgeyi diske kaydeder ve veritabanına yazar.
     */
    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<DocumentResponse>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "documentTypeId", required = false) Long documentTypeId) {
        DocumentResponse response = documentService.upload(file, documentTypeId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Belgeleri filtreleme ve sayfalama ile listeler.
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PagedResponse<DocumentResponse>>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) DocumentStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(documentService.list(search, status, pageable)));
    }

    /**
     * Belirli bir belgenin detayını döndürür.
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<DocumentResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(documentService.getById(id)));
    }

    /**
     * Belgeden OCR ile çıkarılmış alanları listeler.
     */
    @GetMapping("/{id}/extracted-fields")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ExtractedFieldResponse>>> getExtractedFields(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(documentService.getExtractedFields(id)));
    }

    /**
     * Çıkarılan bir alanın değerini manuel olarak düzeltir.
     */
    @PutMapping("/{id}/fields/{fieldId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ExtractedFieldResponse>> correctField(
            @PathVariable Long id,
            @PathVariable Long fieldId,
            @Valid @RequestBody CorrectFieldRequest req) {
        return ResponseEntity.ok(ApiResponse.success(documentService.correctField(id, fieldId, req.getCorrectedValue())));
    }

    /**
     * Belgenin mevcut doğrulama sonucunu döndürür (henüz doğrulanmadıysa null).
     */
    @GetMapping("/{id}/validation")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ValidationResultResponse>> getValidation(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(documentService.getValidation(id)));
    }

    /**
     * Belgeyi (yeniden) doğrular; çıkarılan/düzeltilmiş alanları kural motoruna gönderir.
     */
    @PostMapping("/{id}/validate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ValidationResultResponse>> validate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(documentService.validate(id)));
    }
}
