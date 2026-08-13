package com.traydstream.service;

import com.traydstream.dto.request.Mt707Request;
import com.traydstream.dto.response.Mt707Response;
import com.traydstream.entity.Mt707Amendment;
import com.traydstream.entity.MtMessage;
import com.traydstream.entity.User;
import com.traydstream.exception.AppException;
import com.traydstream.repository.Mt707Repository;
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
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class Mt707Service {

    private final Mt707Repository mt707Repository;
    private final MtMessageRepository mtMessageRepository;
    private final UserRepository userRepository;
    private final WebClient.Builder webClientBuilder;

    @Value("${app.ai-service-url}")
    private String aiServiceUrl;

    @Transactional
    public Mt707Response create(Mt707Request req) {
        User user = getCurrentUser();

        Map<String, Object> parsed = callAiParse(req.getRawText());

        String referenceNumber = getString(parsed, "reference_number");
        String relatedReference = getString(parsed, "related_reference");

        MtMessage mt700 = null;
        boolean autoLinked = false;
        if (relatedReference != null && !relatedReference.isBlank()) {
            mt700 = mtMessageRepository.findFirstByReferenceNumberIgnoreCaseOrderByCreatedAtDesc(relatedReference)
                    .orElse(null);
            autoLinked = mt700 != null;
        }

        Mt707Amendment amendment = Mt707Amendment.builder()
                .user(user)
                .mt700(mt700)
                .referenceNumber(referenceNumber)
                .relatedReference(relatedReference)
                .rawText(req.getRawText())
                .amendmentNumber(getString(parsed, "amendment_number"))
                .amendmentDate(getDate(parsed, "amendment_date"))
                .newExpiryDate(getDate(parsed, "new_expiry_date"))
                .currency(getString(parsed, "currency"))
                .amountIncrease(getDecimal(parsed, "amount_increase"))
                .amountDecrease(getDecimal(parsed, "amount_decrease"))
                .newAmount(getDecimal(parsed, "new_amount"))
                .newLatestShipmentDate(getDate(parsed, "new_latest_shipment_date"))
                .narrative(getString(parsed, "narrative"))
                .build();

        amendment = mt707Repository.save(amendment);
        log.info("MT707 ayrıştırıldı ve kaydedildi: id={}, ref={}, mt700Bağlantısı={}",
                amendment.getId(), referenceNumber, autoLinked ? mt700.getId() : "yok");

        return toResponse(amendment, autoLinked);
    }

    @Transactional(readOnly = true)
    public List<Mt707Response> listForCurrentUser() {
        User user = getCurrentUser();
        return mt707Repository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(a -> toResponse(a, false))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Mt707Response> listByMt700(Long mt700Id) {
        return mt707Repository.findByMt700IdOrderByCreatedAtDesc(mt700Id)
                .stream()
                .map(a -> toResponse(a, false))
                .collect(Collectors.toList());
    }

    @Transactional
    public void delete(Long id) {
        User user = getCurrentUser();
        Mt707Amendment amendment = mt707Repository.findById(id)
                .orElseThrow(() -> new AppException("MT707 değişikliği bulunamadı: " + id, HttpStatus.NOT_FOUND));

        if (!amendment.getUser().getId().equals(user.getId())) {
            throw new AppException("Bu kaydı silme yetkiniz yok", HttpStatus.FORBIDDEN);
        }

        mt707Repository.delete(amendment);
        log.info("MT707 silindi: id={}", id);
    }

    // ── AI Servis Çağrısı ─────────────────────────────────────────────────────

    @SuppressWarnings({"unchecked", "rawtypes"})
    private Map<String, Object> callAiParse(String rawText) {
        Map result;
        try {
            result = webClientBuilder.build()
                    .post()
                    .uri(aiServiceUrl + "/mt/707/parse")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("raw_text", rawText))
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                            response -> response.bodyToMono(String.class).map(body -> {
                                log.error("AI servisi MT707 hata yanıtı [{}]: {}", response.statusCode(), body);
                                return new RuntimeException("AI servisi [" + response.statusCode() + "]: " + body);
                            }))
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            log.error("AI servisi MT707 ayrıştırma hatası: {}", e.getMessage(), e);
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

    private LocalDate getDate(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val == null) return null;
        try { return LocalDate.parse(val.toString()); } catch (Exception e) { return null; }
    }

    private Mt707Response toResponse(Mt707Amendment a, boolean autoLinked) {
        return Mt707Response.builder()
                .id(a.getId())
                .mt700Id(a.getMt700() != null ? a.getMt700().getId() : null)
                .mt700Reference(a.getMt700() != null ? a.getMt700().getReferenceNumber() : null)
                .referenceNumber(a.getReferenceNumber())
                .relatedReference(a.getRelatedReference())
                .mt700AutoLinked(autoLinked)
                .amendmentNumber(a.getAmendmentNumber())
                .amendmentDate(a.getAmendmentDate())
                .newExpiryDate(a.getNewExpiryDate())
                .currency(a.getCurrency())
                .amountIncrease(a.getAmountIncrease())
                .amountDecrease(a.getAmountDecrease())
                .newAmount(a.getNewAmount())
                .newLatestShipmentDate(a.getNewLatestShipmentDate())
                .narrative(a.getNarrative())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
