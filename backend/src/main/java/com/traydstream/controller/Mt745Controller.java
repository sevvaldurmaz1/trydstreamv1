package com.traydstream.controller;

import com.traydstream.dto.request.Mt745Request;
import com.traydstream.dto.response.ApiResponse;
import com.traydstream.dto.response.Mt745Response;
import com.traydstream.exception.AppException;
import com.traydstream.service.Mt745Service;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/mt745")
@RequiredArgsConstructor
public class Mt745Controller {

    private final Mt745Service mt745Service;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Mt745Response>> create(@Valid @RequestBody Mt745Request req) {
        return ResponseEntity.ok(ApiResponse.success(mt745Service.create(req)));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Mt745Response>>> list() {
        return ResponseEntity.ok(ApiResponse.success(mt745Service.listForCurrentUser()));
    }

    @GetMapping("/mt700/{mt700Id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Mt745Response>>> listByMt700(@PathVariable Long mt700Id) {
        return ResponseEntity.ok(ApiResponse.success(mt745Service.listByMt700(mt700Id)));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Mt745Response>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null) {
            throw new AppException("status alanı gereklidir", HttpStatus.BAD_REQUEST);
        }
        return ResponseEntity.ok(ApiResponse.success(mt745Service.updateStatus(id, status)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        mt745Service.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
