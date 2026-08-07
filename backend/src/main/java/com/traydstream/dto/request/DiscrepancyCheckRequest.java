package com.traydstream.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class DiscrepancyCheckRequest {

    /** Kaydedilmiş MT mesaj ID'si */
    @NotNull(message = "MT mesaj ID gereklidir")
    private Long mtId;

    /** Kontrol edilecek belge (fatura/konşimento vb.) ID'si */
    @NotNull(message = "Belge ID gereklidir")
    private Long documentId;

    /** Belge tipi: FATURA, KONSIMENTO, AWB, vb. */
    private String documentType = "FATURA";

    /** Qwen 14B AI açıklaması kullanılsın mı? */
    private boolean useAi = true;

    /** İbraz tarihi (null ise bugün kullanılır) */
    private LocalDate presentationDate;
}
