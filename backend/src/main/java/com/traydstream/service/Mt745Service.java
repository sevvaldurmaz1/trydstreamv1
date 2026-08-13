package com.traydstream.service;

import com.traydstream.dto.request.Mt745Request;
import com.traydstream.dto.response.Mt745Response;
import com.traydstream.entity.Mt745Claim;
import com.traydstream.entity.MtMessage;
import com.traydstream.entity.User;
import com.traydstream.exception.AppException;
import com.traydstream.repository.Mt745Repository;
import com.traydstream.repository.MtMessageRepository;
import com.traydstream.repository.UserRepository;
import com.traydstream.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class Mt745Service {

    private static final Set<String> VALID_STATUSES = Set.of("PENDING", "APPROVED", "REJECTED", "PAID");

    private final Mt745Repository mt745Repository;
    private final MtMessageRepository mtMessageRepository;
    private final UserRepository userRepository;
    private final WebClient.Builder webClientBuilder;

    @Value("${app.ai-service-url}")
    private String aiServiceUrl;

    @Transactional
    public Mt745Response create(Mt745Request req) {
        User user = getCurrentUser();

        Map<String, Object> parsed = callAiParse(req.getRawText());

        String referenceNumber = getString(parsed, "reference_number");
        String relatedReference = getString(parsed, "related_reference");
        String currency = getString(parsed, "currency");
        BigDecimal amount = getDecimal(parsed, "amount");
        String reimbursingBank = getString(parsed, "reimbursing_bank");
        String claimingBankBic = getString(parsed, "claiming_bank_bic");
        String notes = getString(parsed, "notes");

        MtMessage mt700 = null;
        boolean autoLinked = false;
        if (relatedReference != null && !relatedReference.isBlank()) {
            mt700 = mtMessageRepository.findFirstByReferenceNumberIgnoreCaseOrderByCreatedAtDesc(relatedReference)
                    .orElse(null);
            autoLinked = mt700 != null;
        }

        Mt745Claim claim = Mt745Claim.builder()
                .user(user)
                .mt700(mt700)
                .referenceNumber(referenceNumber)
                .relatedReference(relatedReference)
                .rawText(req.getRawText())
                .claimingBank(claimingBankBic)
                .reimbursingBank(reimbursingBank)
                .currency(currency)
                .amount(amount)
                .notes(notes)
                .build();

        claim = mt745Repository.save(claim);
        log.info("MT745 ayrıştırıldı ve kaydedildi: id={}, ref={}, tutar={} {}, mt700Bağlantısı={}",
                claim.getId(), referenceNumber, currency, amount, autoLinked ? mt700.getId() : "yok");

        return toResponse(claim, autoLinked);
    }

    @Transactional(readOnly = true)
    public List<Mt745Response> listForCurrentUser() {
        User user = getCurrentUser();
        return mt745Repository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(c -> toResponse(c, false))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Mt745Response> listByMt700(Long mt700Id) {
        return mt745Repository.findByMt700IdOrderByCreatedAtDesc(mt700Id)
                .stream()
                .map(c -> toResponse(c, false))
                .collect(Collectors.toList());
    }

    @Transactional
    public Mt745Response updateStatus(Long id, String newStatus) {
        if (newStatus == null || !VALID_STATUSES.contains(newStatus.toUpperCase())) {
            throw new AppException("Geçersiz durum: " + newStatus, HttpStatus.BAD_REQUEST);
        }

        Mt745Claim claim = mt745Repository.findById(id)
                .orElseThrow(() -> new AppException("Rambursman talebi bulunamadı: " + id, HttpStatus.NOT_FOUND));

        claim.setStatus(newStatus.toUpperCase());
        claim.setUpdatedAt(Instant.now());
        claim = mt745Repository.save(claim);
        log.info("MT745 durumu güncellendi: id={}, durum={}", id, claim.getStatus());

        return toResponse(claim, false);
    }

    @Transactional
    public void delete(Long id) {
        User user = getCurrentUser();
        Mt745Claim claim = mt745Repository.findById(id)
                .orElseThrow(() -> new AppException("Rambursman talebi bulunamadı: " + id, HttpStatus.NOT_FOUND));

        if (!claim.getUser().getId().equals(user.getId())) {
            throw new AppException("Bu talebi silme yetkiniz yok", HttpStatus.FORBIDDEN);
        }

        mt745Repository.delete(claim);
        log.info("MT745 talebi silindi: id={}", id);
    }

    // ── AI Servis Çağrısı ─────────────────────────────────────────────────────

    @SuppressWarnings({"unchecked", "rawtypes"})
    private Map<String, Object> callAiParse(String rawText) {
        Map result;
        try {
            result = webClientBuilder.build()
                    .post()
                    .uri(aiServiceUrl + "/mt/745/parse")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("raw_text", rawText))
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                            response -> response.bodyToMono(String.class).map(body -> {
                                log.error("AI servisi MT745 hata yanıtı [{}]: {}", response.statusCode(), body);
                                return new RuntimeException("AI servisi [" + response.statusCode() + "]: " + body);
                            }))
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            log.error("AI servisi MT745 ayrıştırma hatası: {}", e.getMessage(), e);
            throw new AppException("AI servisi kullanılamıyor: " + e.getMessage(), HttpStatus.SERVICE_UNAVAILABLE);
        }

        if (result == null) {
            throw new AppException("AI servisi geçersiz yanıt döndürdü (boş gövde)", HttpStatus.BAD_GATEWAY);
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> parsed = (Map<String, Object>) result.getOrDefault("parsed", new HashMap<>());
        return parsed;
    }

    // ── Yardımcılar ───────────────────────────────────────────────────────────

    private User getCurrentUser() {
        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new AppException("Kullanıcı bulunamadı", HttpStatus.UNAUTHORIZED));
    }

    private String getString(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString() : null;
    }

    private BigDecimal getDecimal(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val == null) return null;
        try { return new BigDecimal(val.toString()); } catch (Exception e) { return null; }
    }

    private Mt745Response toResponse(Mt745Claim c, boolean autoLinked) {
        return Mt745Response.builder()
                .id(c.getId())
                .mt700Id(c.getMt700() != null ? c.getMt700().getId() : null)
                .mt700Reference(c.getMt700() != null ? c.getMt700().getReferenceNumber() : null)
                .referenceNumber(c.getReferenceNumber())
                .relatedReference(c.getRelatedReference())
                .mt700AutoLinked(autoLinked)
                .claimingBank(c.getClaimingBank())
                .reimbursingBank(c.getReimbursingBank())
                .currency(c.getCurrency())
                .amount(c.getAmount())
                .valueDate(c.getValueDate())
                .status(c.getStatus())
                .notes(c.getNotes())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
