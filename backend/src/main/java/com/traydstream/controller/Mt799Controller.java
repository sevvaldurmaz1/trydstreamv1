package com.traydstream.controller;

import com.traydstream.dto.request.Mt799Request;
import com.traydstream.dto.response.ApiResponse;
import com.traydstream.dto.response.Mt799Response;
import com.traydstream.service.Mt799Service;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/mt799")
@RequiredArgsConstructor
public class Mt799Controller {

    private final Mt799Service mt799Service;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Mt799Response>> create(@Valid @RequestBody Mt799Request req) {
        return ResponseEntity.ok(ApiResponse.success(mt799Service.create(req)));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Mt799Response>>> list() {
        return ResponseEntity.ok(ApiResponse.success(mt799Service.listForCurrentUser()));
    }

    @GetMapping("/mt700/{mt700Id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Mt799Response>>> listByMt700(@PathVariable Long mt700Id) {
        return ResponseEntity.ok(ApiResponse.success(mt799Service.listByMt700(mt700Id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        mt799Service.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
