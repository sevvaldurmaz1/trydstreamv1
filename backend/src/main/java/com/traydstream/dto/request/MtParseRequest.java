package com.traydstream.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MtParseRequest {

    @NotBlank(message = "MT metni boş olamaz")
    @Size(min = 10, max = 50000, message = "MT metni 10-50000 karakter arasında olmalıdır")
    private String rawText;

    /** İlişkili belge ID (opsiyonel – MT ile birlikte belge de bağlanmak isteniyorsa) */
    private Long documentId;
}
