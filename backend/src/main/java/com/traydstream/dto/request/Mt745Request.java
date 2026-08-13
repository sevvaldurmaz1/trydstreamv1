package com.traydstream.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class Mt745Request {

    private Long mt700Id;
    private String referenceNumber;

    @NotBlank(message = "Talep eden banka boş olamaz")
    private String claimingBank;

    private String reimbursingBank;

    @NotBlank(message = "Döviz cinsi boş olamaz")
    private String currency;

    @NotNull(message = "Tutar boş olamaz")
    private BigDecimal amount;

    private LocalDate valueDate;
    private String notes;
}
