package com.traydstream.controller;

import com.traydstream.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/processing-history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> processingHistory() {
        return csvResponse(reportService.generateProcessingHistoryCsv(), "islem-gecmisi.csv");
    }

    @GetMapping("/validation-report")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> validationReport() {
        return csvResponse(reportService.generateValidationReportCsv(), "dogrulama-raporu.csv");
    }

    private ResponseEntity<byte[]> csvResponse(byte[] content, String filename) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename).build().toString())
                .body(content);
    }
}
