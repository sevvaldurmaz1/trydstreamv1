package com.traydstream.repository;

import com.traydstream.entity.ValidationResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ValidationResultRepository extends JpaRepository<ValidationResult, Long> {

    Optional<ValidationResult> findByDocumentId(Long documentId);
}
