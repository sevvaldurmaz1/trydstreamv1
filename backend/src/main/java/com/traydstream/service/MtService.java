package com.traydstream.service;

import com.traydstream.dto.request.MtParseRequest;
import com.traydstream.dto.response.MtMessageResponse;
import com.traydstream.entity.MtMessage;
import com.traydstream.entity.User;
import com.traydstream.exception.AppException;
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
public class MtService {

    private final MtMessageRepository mtMessageRepository;
    private final UserRepository userRepository;
    private final WebClient.Builder webClientBuilder;

    @Value("${app.ai-service-url}")
    private String aiServiceUrl;

    // ── Ayrıştır ve Kaydet ────────────────────────────────────────────────────

    @Transactional
    public MtMessageResponse parseAndSave(MtParseRequest req) {
        // Kullanıcıyı al
        User user = getCurrentUser();

        // AI servisi üzerinden ayrıştır
        Map<String, Object> aiResponse = callAiParse(req.getRawText());

        @SuppressWarnings("unchecked")
        Map<String, Object> parsed = (Map<String, Object>) aiResponse.getOrDefault("parsed", new HashMap<>());

        // MtMessage entity oluştur
        MtMessage mt = MtMessage.builder()
                .user(user)
                .rawText(req.getRawText())
                .mtType("MT700")
                .referenceNumber(getString(parsed, "reference_number"))
                .lcCurrency(getString(parsed, "lc_currency"))
                .lcAmount(getDecimal(parsed, "lc_amount"))
                .tolerancePositive(getDecimal(parsed, "tolerance_positive"))
                .toleranceNegative(getDecimal(parsed, "tolerance_negative"))
                .applicant(getString(parsed, "applicant"))
                .beneficiary(getString(parsed, "beneficiary"))
                .goodsDescription(getString(parsed, "goods_description"))
                .documentsRequired(getString(parsed, "documents_required"))
                .partialShipments(getString(parsed, "partial_shipments"))
                .transhipment(getString(parsed, "transhipment"))
                .portOfLoading(getString(parsed, "port_of_loading"))
                .portOfDischarge(getString(parsed, "port_of_discharge"))
                .applicableRules(getString(parsed, "applicable_rules"))
                .presentationPeriodDays(getInt(parsed, "presentation_period_days"))
                .build();

        // Tarih alanları
        String expiryStr = getString(parsed, "lc_expiry_date");
        if (expiryStr != null) {
            try { mt.setLcExpiryDate(LocalDate.parse(expiryStr)); } catch (Exception ignored) {}
        }
        String shipmentStr = getString(parsed, "latest_shipment_date");
        if (shipmentStr != null) {
            try { mt.setLatestShipmentDate(LocalDate.parse(shipmentStr)); } catch (Exception ignored) {}
        }

        mt = mtMessageRepository.save(mt);
        log.info("MT700 kaydedildi: id={}, ref={}", mt.getId(), mt.getReferenceNumber());

        return toResponse(mt, ((Number) aiResponse.getOrDefault("field_count", 0)).intValue());
    }

    @Transactional
    public MtMessageResponse updateAndReparse(Long id, MtParseRequest req) {
        MtMessage existing = mtMessageRepository.findById(id)
                .orElseThrow(() -> new AppException("MT mesajı bulunamadı: " + id, HttpStatus.NOT_FOUND));

        Map<String, Object> aiResponse = callAiParse(req.getRawText());

        @SuppressWarnings("unchecked")
        Map<String, Object> parsed = (Map<String, Object>) aiResponse.getOrDefault("parsed", new HashMap<>());

        existing.setRawText(req.getRawText());
        existing.setReferenceNumber(getString(parsed, "reference_number"));
        existing.setLcCurrency(getString(parsed, "lc_currency"));
        existing.setLcAmount(getDecimal(parsed, "lc_amount"));
        existing.setTolerancePositive(getDecimal(parsed, "tolerance_positive"));
        existing.setToleranceNegative(getDecimal(parsed, "tolerance_negative"));
        existing.setApplicant(getString(parsed, "applicant"));
        existing.setBeneficiary(getString(parsed, "beneficiary"));
        existing.setGoodsDescription(getString(parsed, "goods_description"));
        existing.setDocumentsRequired(getString(parsed, "documents_required"));
        existing.setPartialShipments(getString(parsed, "partial_shipments"));
        existing.setTranshipment(getString(parsed, "transhipment"));
        existing.setPortOfLoading(getString(parsed, "port_of_loading"));
        existing.setPortOfDischarge(getString(parsed, "port_of_discharge"));
        existing.setApplicableRules(getString(parsed, "applicable_rules"));
        existing.setPresentationPeriodDays(getInt(parsed, "presentation_period_days"));

        String expiryStr = getString(parsed, "lc_expiry_date");
        if (expiryStr != null) {
            try { existing.setLcExpiryDate(java.time.LocalDate.parse(expiryStr)); } catch (Exception ignored) {}
        }
        String shipmentStr = getString(parsed, "latest_shipment_date");
        if (shipmentStr != null) {
            try { existing.setLatestShipmentDate(java.time.LocalDate.parse(shipmentStr)); } catch (Exception ignored) {}
        }

        existing = mtMessageRepository.save(existing);
        log.info("MT700 güncellendi: id={}, ref={}", existing.getId(), existing.getReferenceNumber());
        return toResponse(existing, ((Number) aiResponse.getOrDefault("field_count", 0)).intValue());
    }

    // ── Listeleme ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MtMessageResponse> listForCurrentUser() {
        User user = getCurrentUser();
        return mtMessageRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(m -> toResponse(m, 0))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MtMessageResponse getById(Long id) {
        MtMessage mt = mtMessageRepository.findById(id)
                .orElseThrow(() -> new AppException("MT mesajı bulunamadı: " + id, HttpStatus.NOT_FOUND));
        return toResponse(mt, 0);
    }

    // ── AI Servis Çağrısı ─────────────────────────────────────────────────────

    @SuppressWarnings({"unchecked", "rawtypes"})
    private Map<String, Object> callAiParse(String rawText) {
        Map result;
        try {
            result = webClientBuilder.build()
                    .post()
                    .uri(aiServiceUrl + "/mt/parse")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("raw_text", rawText))
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                            response -> response.bodyToMono(String.class).map(body -> {
                                log.error("AI servisi hata yanıtı [{}]: {}", response.statusCode(), body);
                                return new RuntimeException("AI servisi [" + response.statusCode() + "]: " + body);
                            }))
                    .bodyToMono(Map.class)
                    .block();
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("AI servisi MT ayrıştırma hatası: {}", e.getMessage(), e);
            throw new AppException("AI servisi kullanılamıyor: " + e.getMessage(), HttpStatus.SERVICE_UNAVAILABLE);
        }

        if (result == null) {
            log.error("AI servisi boş yanıt döndürdü (null body)");
            throw new AppException("AI servisi geçersiz yanıt döndürdü (boş gövde)", HttpStatus.BAD_GATEWAY);
        }

        return (Map<String, Object>) result;
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

    private Integer getInt(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val == null) return null;
        try { return ((Number) val).intValue(); } catch (Exception e) { return null; }
    }

    private MtMessageResponse toResponse(MtMessage mt, int fieldCount) {
        return MtMessageResponse.builder()
                .id(mt.getId())
                .mtType(mt.getMtType())
                .referenceNumber(mt.getReferenceNumber())
                .lcExpiryDate(mt.getLcExpiryDate())
                .lcAmount(mt.getLcAmount())
                .lcCurrency(mt.getLcCurrency())
                .tolerancePositive(mt.getTolerancePositive())
                .toleranceNegative(mt.getToleranceNegative())
                .applicant(mt.getApplicant())
                .beneficiary(mt.getBeneficiary())
                .goodsDescription(mt.getGoodsDescription())
                .documentsRequired(mt.getDocumentsRequired())
                .latestShipmentDate(mt.getLatestShipmentDate())
                .presentationPeriodDays(mt.getPresentationPeriodDays())
                .partialShipments(mt.getPartialShipments())
                .transhipment(mt.getTranshipment())
                .portOfLoading(mt.getPortOfLoading())
                .portOfDischarge(mt.getPortOfDischarge())
                .applicableRules(mt.getApplicableRules())
                .createdAt(mt.getCreatedAt())
                .fieldCount(fieldCount)
                .build();
    }
}
