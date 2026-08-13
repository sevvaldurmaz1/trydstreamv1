package com.traydstream.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "discrepancy_findings")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiscrepancyFinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private DiscrepancyReport report;

    @Column(name = "rule_code", nullable = false, length = 20)
    private String ruleCode;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "finding_type", nullable = false, columnDefinition = "CHAR(1)")
    private String findingType;  // 'R' veya 'O'

    @Column(name = "field_name", length = 100)
    private String fieldName;

    @Column(name = "mt_value", columnDefinition = "TEXT")
    private String mtValue;

    @Column(name = "document_value", columnDefinition = "TEXT")
    private String documentValue;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "ai_explanation", columnDefinition = "TEXT")
    private String aiExplanation;

    @Column(name = "isbp_reference", length = 200)
    private String isbpReference;

    @Column(name = "ucp_reference", length = 200)
    private String ucpReference;

    @Column(name = "is_waived")
    @Builder.Default
    private Boolean isWaived = false;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
