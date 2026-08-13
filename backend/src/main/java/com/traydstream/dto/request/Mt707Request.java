package com.traydstream.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class Mt707Request {

    @NotBlank(message = "MT707 metni boş olamaz")
    @Size(min = 5, max = 50000, message = "MT707 metni 5-50000 karakter arasında olmalıdır")
    private String rawText;
}
