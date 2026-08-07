package com.traydstream.controller;

import com.traydstream.dto.request.MtParseRequest;
import com.traydstream.dto.response.ApiResponse;
import com.traydstream.dto.response.MtMessageResponse;
import com.traydstream.service.MtService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/mt")
@RequiredArgsConstructor
public class MtController {

    private final MtService mtService;

    /**
     * MT 700 mesajını ayrıştırır ve veritabanına kaydeder.
     */
    @PostMapping("/parse")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<MtMessageResponse>> parseMt(
            @Valid @RequestBody MtParseRequest req) {
        MtMessageResponse response = mtService.parseAndSave(req);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Mevcut kullanıcının tüm MT mesajlarını listeler.
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<MtMessageResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(mtService.listForCurrentUser()));
    }

    /**
     * Belirli bir MT mesajının detayını döndürür.
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<MtMessageResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(mtService.getById(id)));
    }
}
