package com.traydstream.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "mt745_claims")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Mt745Claim {

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

    @Column(name = "claiming_bank", length = 255)
    private String claimingBank;

    @Column(name = "reimbursing_bank", length = 255)
    private String reimbursingBank;

    @Column(name = "currency", length = 10)
    private String currency;

    @Column(name = "amount", precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "value_date")
    private LocalDate valueDate;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
