package com.traydstream.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "discrepancy_reports")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiscrepancyReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mt_message_id", nullable = false)
    private MtMessage mtMessage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @Column(name = "overall_result", nullable = false, length = 20)
    @Builder.Default
    private String overallResult = "PENDING";

    @Column(name = "total_findings")
    @Builder.Default
    private Integer totalFindings = 0;

    @Column(name = "mandatory_findings")
    @Builder.Default
    private Integer mandatoryFindings = 0;

    @Column(name = "optional_findings")
    @Builder.Default
    private Integer optionalFindings = 0;

    @Column(name = "checked_at")
    @Builder.Default
    private Instant checkedAt = Instant.now();

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<DiscrepancyFinding> findings = new ArrayList<>();
}
