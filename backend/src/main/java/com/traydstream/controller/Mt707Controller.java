package com.traydstream.controller;

import com.traydstream.dto.request.Mt707Request;
import com.traydstream.dto.response.ApiResponse;
import com.traydstream.dto.response.Mt707Response;
import com.traydstream.service.Mt707Service;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/mt707")
@RequiredArgsConstructor
public class Mt707Controller {

    private final Mt707Service mt707Service;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Mt707Response>> create(@Valid @RequestBody Mt707Request req) {
        return ResponseEntity.ok(ApiResponse.success(mt707Service.create(req)));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Mt707Response>>> list() {
        return ResponseEntity.ok(ApiResponse.success(mt707Service.listForCurrentUser()));
    }

    @GetMapping("/mt700/{mt700Id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Mt707Response>>> listByMt700(@PathVariable Long mt700Id) {
        return ResponseEntity.ok(ApiResponse.success(mt707Service.listByMt700(mt700Id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        mt707Service.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
