package com.traydstream.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class Mt799Request {

    @NotBlank(message = "Mesaj metni boş olamaz")
    private String messageText;

    private String referenceNumber;
    private Long mt700Id;
    private String senderBic;
    private String receiverBic;
    private String subject;
    private String direction;
}
