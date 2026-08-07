package com.traydstream.entity;

import com.traydstream.entity.enums.ValidationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "validation_results")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ValidationResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false, unique = true)
    private Document document;

    @Enumerated(EnumType.STRING)
    @Column(name = "overall_status", nullable = false, length = 50)
    @Builder.Default
    private ValidationStatus overallStatus = ValidationStatus.PENDING;

    @Column(name = "confidence_score")
    @Builder.Default
    private Integer confidenceScore = 0;

    @CreatedDate
    @Column(name = "validated_at")
    private Instant validatedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "validationResult", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ValidationIssue> issues = new ArrayList<>();
}
