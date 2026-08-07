package com.traydstream.service;

import com.traydstream.dto.response.DocumentResponse;
import com.traydstream.dto.response.DocumentTypeResponse;
import com.traydstream.dto.response.PagedResponse;
import com.traydstream.entity.Document;
import com.traydstream.entity.DocumentType;
import com.traydstream.entity.User;
import com.traydstream.entity.enums.DocumentStatus;
import com.traydstream.exception.AppException;
import com.traydstream.repository.DocumentRepository;
import com.traydstream.repository.DocumentTypeRepository;
import com.traydstream.repository.UserRepository;
import com.traydstream.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final UserRepository userRepository;

    @Value("${app.upload-dir}")
    private String uploadDir;

    @Transactional
    public DocumentResponse upload(MultipartFile file, Long documentTypeId) {
        if (file == null || file.isEmpty()) {
            throw new AppException("Yüklenecek dosya boş olamaz", HttpStatus.BAD_REQUEST);
        }

        User user = getCurrentUser();

        DocumentType documentType = null;
        if (documentTypeId != null) {
            documentType = documentTypeRepository.findById(documentTypeId)
                    .orElseThrow(() -> new AppException("Belge tipi bulunamadı: " + documentTypeId, HttpStatus.NOT_FOUND));
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        String extension = "";
        int dotIdx = originalName.lastIndexOf('.');
        if (dotIdx >= 0) {
            extension = originalName.substring(dotIdx);
        }
        String storedName = UUID.randomUUID() + extension;

        try {
            Path dir = Paths.get(uploadDir);
            Files.createDirectories(dir);
            Path destination = dir.resolve(storedName);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

            Document document = Document.builder()
                    .uploadedBy(user)
                    .documentType(documentType)
                    .fileName(originalName)
                    .filePath(destination.toString())
                    .fileSize(file.getSize())
                    .mimeType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                    .status(DocumentStatus.UPLOADED)
                    .build();

            document = documentRepository.save(document);
            log.info("Belge yüklendi: id={}, dosya={}", document.getId(), originalName);

            return toResponse(document);
        } catch (IOException e) {
            log.error("Belge kaydedilemedi: {}", e.getMessage(), e);
            throw new AppException("Belge kaydedilemedi: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Transactional(readOnly = true)
    public PagedResponse<DocumentResponse> list(String search, DocumentStatus status, Pageable pageable) {
        Page<Document> page = documentRepository.findAllWithFilters(search, status, pageable);
        return PagedResponse.from(page.map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public DocumentResponse getById(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new AppException("Belge bulunamadı: " + id, HttpStatus.NOT_FOUND));
        return toResponse(document);
    }

    private User getCurrentUser() {
        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new AppException("Kullanıcı bulunamadı", HttpStatus.UNAUTHORIZED));
    }

    private DocumentResponse toResponse(Document d) {
        DocumentTypeResponse typeResponse = null;
        if (d.getDocumentType() != null) {
            DocumentType dt = d.getDocumentType();
            typeResponse = DocumentTypeResponse.builder()
                    .id(dt.getId())
                    .name(dt.getName())
                    .code(dt.getCode())
                    .description(dt.getDescription())
                    .build();
        }

        return DocumentResponse.builder()
                .id(d.getId())
                .fileName(d.getFileName())
                .fileSize(d.getFileSize())
                .mimeType(d.getMimeType())
                .status(d.getStatus())
                .documentType(typeResponse)
                .uploadedBy(d.getUploadedBy().getEmail())
                .uploadedAt(d.getUploadedAt())
                .processedAt(d.getProcessedAt())
                .extractedFieldCount(d.getExtractedFieldCount())
                .validationScore(null)
                .build();
    }
}
