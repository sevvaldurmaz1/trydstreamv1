package com.traydstream.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "mt799_messages")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Mt799Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mt700_id")
    private MtMessage mt700;

    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    @Column(name = "sender_bic", length = 20)
    private String senderBic;

    @Column(name = "receiver_bic", length = 20)
    private String receiverBic;

    @Column(name = "subject", length = 255)
    private String subject;

    @Column(name = "message_text", nullable = false, columnDefinition = "TEXT")
    private String messageText;

    @Column(name = "direction", nullable = false, length = 10)
    @Builder.Default
    private String direction = "OUTGOING";

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
