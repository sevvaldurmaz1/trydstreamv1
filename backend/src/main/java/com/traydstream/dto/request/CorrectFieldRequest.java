package com.traydstream.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CorrectFieldRequest {

    @NotBlank(message = "correctedValue boş olamaz")
    private String correctedValue;
}
