package com.traydstream.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Mt799Response {
    private Long id;
    private Long mt700Id;
    private String mt700Reference;
    private String referenceNumber;
    private String relatedReference;
    private Boolean mt700AutoLinked;
    private String senderBic;
    private String receiverBic;
    private String subject;
    private String messageText;
    private String direction;
    private Instant createdAt;
}
