package com.traydstream.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "validation_issues")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ValidationIssue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "validation_result_id", nullable = false)
    private ValidationResult validationResult;

    @Column(name = "issue_type", nullable = false, length = 100)
    private String issueType;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String severity = "MEDIUM";

    @Column(name = "field_name", length = 100)
    private String fieldName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_resolved")
    @Builder.Default
    private Boolean isResolved = false;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
