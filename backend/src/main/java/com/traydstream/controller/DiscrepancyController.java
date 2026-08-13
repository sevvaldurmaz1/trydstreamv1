package com.traydstream.controller;

import com.traydstream.dto.request.DiscrepancyCheckRequest;
import com.traydstream.dto.response.ApiResponse;
import com.traydstream.dto.response.DiscrepancyReportResponse;
import com.traydstream.service.DiscrepancyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/discrepancy")
@RequiredArgsConstructor
public class DiscrepancyController {

    private final DiscrepancyService discrepancyService;

    /**
     * MT 700 ile seçili belge arasındaki aykırılıkları kontrol eder.
     * 193 kural kodunu uygular; Qwen 14B ile AI açıklaması ekler.
     */
    @PostMapping("/check")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<DiscrepancyReportResponse>> check(
            @Valid @RequestBody DiscrepancyCheckRequest req) {
        DiscrepancyReportResponse response = discrepancyService.checkDiscrepancy(req);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Mevcut kullanıcının tüm aykırılık raporlarını listeler.
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<DiscrepancyReportResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(discrepancyService.listForCurrentUser()));
    }

    /**
     * Belirli bir aykırılık raporunun detayını döndürür.
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<DiscrepancyReportResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(discrepancyService.getById(id)));
    }

    /**
     * Belirli bir MT mesajına bağlı tüm aykırılık raporlarını listeler.
     */
    @GetMapping("/mt/{mtMessageId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<DiscrepancyReportResponse>>> listByMtMessage(@PathVariable Long mtMessageId) {
        return ResponseEntity.ok(ApiResponse.success(discrepancyService.listByMtMessage(mtMessageId)));
    }
}
