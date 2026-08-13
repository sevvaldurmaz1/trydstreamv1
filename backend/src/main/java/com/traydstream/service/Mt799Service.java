package com.traydstream.service;

import com.traydstream.dto.request.Mt799Request;
import com.traydstream.dto.response.Mt799Response;
import com.traydstream.entity.Mt799Message;
import com.traydstream.entity.MtMessage;
import com.traydstream.entity.User;
import com.traydstream.exception.AppException;
import com.traydstream.repository.Mt799Repository;
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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class Mt799Service {

    private final Mt799Repository mt799Repository;
    private final MtMessageRepository mtMessageRepository;
    private final UserRepository userRepository;
    private final WebClient.Builder webClientBuilder;

    @Value("${app.ai-service-url}")
    private String aiServiceUrl;

    @Transactional
    public Mt799Response create(Mt799Request req) {
        User user = getCurrentUser();

        Map<String, Object> parsed = callAiParse(req.getRawText());

        String referenceNumber = getString(parsed, "reference_number");
        String relatedReference = getString(parsed, "related_reference");
        String narrative = getString(parsed, "narrative");
        String senderBic = getString(parsed, "sender_bic");
        String receiverBic = getString(parsed, "receiver_bic");

        MtMessage mt700 = null;
        boolean autoLinked = false;
        if (relatedReference != null && !relatedReference.isBlank()) {
            mt700 = mtMessageRepository.findFirstByReferenceNumberIgnoreCaseOrderByCreatedAtDesc(relatedReference)
                    .orElse(null);
            autoLinked = mt700 != null;
        }

        Mt799Message message = Mt799Message.builder()
                .user(user)
                .mt700(mt700)
                .referenceNumber(referenceNumber)
                .relatedReference(relatedReference)
                .rawText(req.getRawText())
                .senderBic(senderBic)
                .receiverBic(receiverBic)
                .messageText(narrative != null ? narrative : req.getRawText())
                .direction("OUTGOING")
                .build();

        message = mt799Repository.save(message);
        log.info("MT799 ayrıştırıldı ve kaydedildi: id={}, ref={}, mt700Bağlantısı={}",
                message.getId(), referenceNumber, autoLinked ? mt700.getId() : "yok");

        return toResponse(message, autoLinked);
    }

    @Transactional(readOnly = true)
    public List<Mt799Response> listForCurrentUser() {
        User user = getCurrentUser();
        return mt799Repository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(m -> toResponse(m, false))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Mt799Response> listByMt700(Long mt700Id) {
        return mt799Repository.findByMt700IdOrderByCreatedAtDesc(mt700Id)
                .stream()
                .map(m -> toResponse(m, false))
                .collect(Collectors.toList());
    }

    @Transactional
    public void delete(Long id) {
        User user = getCurrentUser();
        Mt799Message message = mt799Repository.findById(id)
                .orElseThrow(() -> new AppException("MT799 mesajı bulunamadı: " + id, HttpStatus.NOT_FOUND));

        if (!message.getUser().getId().equals(user.getId())) {
            throw new AppException("Bu mesajı silme yetkiniz yok", HttpStatus.FORBIDDEN);
        }

        mt799Repository.delete(message);
        log.info("MT799 silindi: id={}", id);
    }

    // ── AI Servis Çağrısı ─────────────────────────────────────────────────────

    @SuppressWarnings({"unchecked", "rawtypes"})
    private Map<String, Object> callAiParse(String rawText) {
        Map result;
        try {
            result = webClientBuilder.build()
                    .post()
                    .uri(aiServiceUrl + "/mt/799/parse")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("raw_text", rawText))
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                            response -> response.bodyToMono(String.class).map(body -> {
                                log.error("AI servisi MT799 hata yanıtı [{}]: {}", response.statusCode(), body);
                                return new RuntimeException("AI servisi [" + response.statusCode() + "]: " + body);
                            }))
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            log.error("AI servisi MT799 ayrıştırma hatası: {}", e.getMessage(), e);
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

    private Mt799Response toResponse(Mt799Message m, boolean autoLinked) {
        return Mt799Response.builder()
                .id(m.getId())
                .mt700Id(m.getMt700() != null ? m.getMt700().getId() : null)
                .mt700Reference(m.getMt700() != null ? m.getMt700().getReferenceNumber() : null)
                .referenceNumber(m.getReferenceNumber())
                .relatedReference(m.getRelatedReference())
                .mt700AutoLinked(autoLinked)
                .senderBic(m.getSenderBic())
                .receiverBic(m.getReceiverBic())
                .subject(m.getSubject())
                .messageText(m.getMessageText())
                .direction(m.getDirection())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
