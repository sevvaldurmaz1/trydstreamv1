package com.traydstream.repository;

import com.traydstream.entity.Document;
import com.traydstream.entity.enums.DocumentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    @Query("""
        SELECT d FROM Document d
        WHERE (:search IS NULL OR LOWER(d.fileName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))
          AND (:status IS NULL OR d.status = :status)
        ORDER BY d.uploadedAt DESC
        """)
    Page<Document> findAllWithFilters(
        @Param("search") String search,
        @Param("status") DocumentStatus status,
        Pageable pageable
    );

    long countByStatus(DocumentStatus status);

    @Query("SELECT COUNT(d) FROM Document d WHERE d.uploadedAt >= :from")
    long countUploadedSince(@Param("from") Instant from);

    List<Document> findTop10ByOrderByUploadedAtDesc();
}
