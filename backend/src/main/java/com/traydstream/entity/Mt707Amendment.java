package com.traydstream.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "mt707_amendments")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Mt707Amendment {

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

    @Column(name = "related_reference", length = 100)
    private String relatedReference;

    @Column(name = "raw_text", nullable = false, columnDefinition = "TEXT")
    private String rawText;

    @Column(name = "amendment_number", length = 50)
    private String amendmentNumber;

    @Column(name = "amendment_date")
    private LocalDate amendmentDate;

    @Column(name = "new_expiry_date")
    private LocalDate newExpiryDate;

    @Column(name = "currency", length = 10)
    private String currency;

    @Column(name = "amount_increase", precision = 18, scale = 2)
    private BigDecimal amountIncrease;

    @Column(name = "amount_decrease", precision = 18, scale = 2)
    private BigDecimal amountDecrease;

    @Column(name = "new_amount", precision = 18, scale = 2)
    private BigDecimal newAmount;

    @Column(name = "new_latest_shipment_date")
    private LocalDate newLatestShipmentDate;

    @Column(name = "narrative", columnDefinition = "TEXT")
    private String narrative;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
