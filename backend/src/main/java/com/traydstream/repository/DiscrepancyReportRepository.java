package com.traydstream.repository;

import com.traydstream.entity.DiscrepancyReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiscrepancyReportRepository extends JpaRepository<DiscrepancyReport, Long> {

    List<DiscrepancyReport> findByUserIdOrderByCheckedAtDesc(Long userId);

    List<DiscrepancyReport> findByMtMessageIdOrderByCheckedAtDesc(Long mtMessageId);

    Optional<DiscrepancyReport> findByMtMessageIdAndDocumentId(Long mtMessageId, Long documentId);

    @Query("SELECT COUNT(r) FROM DiscrepancyReport r WHERE r.overallResult = 'DISCREPANT' AND r.user.id = :userId")
    long countDiscrepantByUserId(Long userId);
}
