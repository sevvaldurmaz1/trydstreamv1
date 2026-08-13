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
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
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

    @Transactional
    public Mt745Response create(Mt745Request req) {
        User user = getCurrentUser();

        MtMessage mt700 = null;
        if (req.getMt700Id() != null) {
            mt700 = mtMessageRepository.findById(req.getMt700Id())
                    .orElseThrow(() -> new AppException("MT700 bulunamadı: " + req.getMt700Id(), HttpStatus.NOT_FOUND));
        }

        Mt745Claim claim = Mt745Claim.builder()
                .user(user)
                .mt700(mt700)
                .referenceNumber(req.getReferenceNumber())
                .claimingBank(req.getClaimingBank())
                .reimbursingBank(req.getReimbursingBank())
                .currency(req.getCurrency())
                .amount(req.getAmount())
                .valueDate(req.getValueDate())
                .notes(req.getNotes())
                .build();

        claim = mt745Repository.save(claim);
        log.info("MT745 talebi kaydedildi: id={}, mt700Id={}", claim.getId(), req.getMt700Id());

        return toResponse(claim);
    }

    @Transactional(readOnly = true)
    public List<Mt745Response> listForCurrentUser() {
        User user = getCurrentUser();
        return mt745Repository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Mt745Response> listByMt700(Long mt700Id) {
        return mt745Repository.findByMt700IdOrderByCreatedAtDesc(mt700Id)
                .stream()
                .map(this::toResponse)
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

        return toResponse(claim);
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

    private User getCurrentUser() {
        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new AppException("Kullanıcı bulunamadı", HttpStatus.UNAUTHORIZED));
    }

    private Mt745Response toResponse(Mt745Claim c) {
        return Mt745Response.builder()
                .id(c.getId())
                .mt700Id(c.getMt700() != null ? c.getMt700().getId() : null)
                .mt700Reference(c.getMt700() != null ? c.getMt700().getReferenceNumber() : null)
                .referenceNumber(c.getReferenceNumber())
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
