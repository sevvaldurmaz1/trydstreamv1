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
public class Mt707Response {
    private Long id;
    private Long mt700Id;
    private String mt700Reference;
    private String referenceNumber;
    private String relatedReference;
    private Boolean mt700AutoLinked;
    private String amendmentNumber;
    private LocalDate amendmentDate;
    private LocalDate newExpiryDate;
    private String currency;
    private BigDecimal amountIncrease;
    private BigDecimal amountDecrease;
    private BigDecimal newAmount;
    private LocalDate newLatestShipmentDate;
    private String narrative;
    private Instant createdAt;
}
