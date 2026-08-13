package com.traydstream.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Mt745Response {
    private Long id;
    private Long mt700Id;
    private String mt700Reference;
    private String referenceNumber;
    private String relatedReference;
    private Boolean mt700AutoLinked;
    private String claimingBank;
    private String reimbursingBank;
    private String currency;
    private BigDecimal amount;
    private LocalDate valueDate;
    private String status;
    private String notes;
    private Instant createdAt;
    private Instant updatedAt;
}
