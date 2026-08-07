package com.traydstream.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "mt_messages")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MtMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "mt_type", nullable = false, length = 10)
    @Builder.Default
    private String mtType = "MT700";

    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    @Column(name = "raw_text", nullable = false, columnDefinition = "TEXT")
    private String rawText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "parsed_fields", columnDefinition = "jsonb")
    private Map<String, Object> parsedFields;

    @Column(name = "lc_expiry_date")
    private LocalDate lcExpiryDate;

    @Column(name = "lc_amount", precision = 18, scale = 2)
    private BigDecimal lcAmount;

    @Column(name = "lc_currency", length = 10)
    private String lcCurrency;

    @Column(name = "applicant", columnDefinition = "TEXT")
    private String applicant;

    @Column(name = "beneficiary", columnDefinition = "TEXT")
    private String beneficiary;

    @Column(name = "goods_description", columnDefinition = "TEXT")
    private String goodsDescription;

    @Column(name = "documents_required", columnDefinition = "TEXT")
    private String documentsRequired;

    @Column(name = "latest_shipment_date")
    private LocalDate latestShipmentDate;

    @Column(name = "presentation_period_days")
    private Integer presentationPeriodDays;

    @Column(name = "partial_shipments", length = 20)
    private String partialShipments;

    @Column(name = "transhipment", length = 20)
    private String transhipment;

    @Column(name = "port_of_loading", length = 255)
    private String portOfLoading;

    @Column(name = "port_of_discharge", length = 255)
    private String portOfDischarge;

    @Column(name = "tolerance_positive", precision = 5, scale = 2)
    private BigDecimal tolerancePositive;

    @Column(name = "tolerance_negative", precision = 5, scale = 2)
    private BigDecimal toleranceNegative;

    @Column(name = "applicable_rules", length = 100)
    private String applicableRules;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
