package com.traydstream.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
public class MtMessageResponse {
    private Long id;
    private String mtType;
    private String referenceNumber;
    private LocalDate lcExpiryDate;
    private String lcExpiryPlace;
    private BigDecimal lcAmount;
    private String lcCurrency;
    private BigDecimal tolerancePositive;
    private BigDecimal toleranceNegative;
    private String applicant;
    private String beneficiary;
    private String goodsDescription;
    private String documentsRequired;
    private LocalDate latestShipmentDate;
    private Integer presentationPeriodDays;
    private String partialShipments;
    private String transhipment;
    private String portOfLoading;
    private String portOfDischarge;
    private String applicableRules;
    private Instant createdAt;
    private int fieldCount;
}
