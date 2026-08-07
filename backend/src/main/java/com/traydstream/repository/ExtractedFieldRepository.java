package com.traydstream.repository;

import com.traydstream.entity.ExtractedField;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExtractedFieldRepository extends JpaRepository<ExtractedField, Long> {

    List<ExtractedField> findByDocumentId(Long documentId);
}
