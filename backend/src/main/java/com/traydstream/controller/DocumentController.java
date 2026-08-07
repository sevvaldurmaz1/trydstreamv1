package com.traydstream.controller;

import com.traydstream.dto.response.ApiResponse;
import com.traydstream.dto.response.DocumentResponse;
import com.traydstream.dto.response.PagedResponse;
import com.traydstream.entity.enums.DocumentStatus;
import com.traydstream.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
}
