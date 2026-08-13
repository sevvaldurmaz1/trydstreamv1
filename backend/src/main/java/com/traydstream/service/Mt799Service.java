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
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class Mt799Service {

    private final Mt799Repository mt799Repository;
    private final MtMessageRepository mtMessageRepository;
    private final UserRepository userRepository;

    @Transactional
    public Mt799Response create(Mt799Request req) {
        User user = getCurrentUser();

        MtMessage mt700 = null;
        if (req.getMt700Id() != null) {
            mt700 = mtMessageRepository.findById(req.getMt700Id())
                    .orElseThrow(() -> new AppException("MT700 bulunamadı: " + req.getMt700Id(), HttpStatus.NOT_FOUND));
        }

        Mt799Message message = Mt799Message.builder()
                .user(user)
                .mt700(mt700)
                .referenceNumber(req.getReferenceNumber())
                .senderBic(req.getSenderBic())
                .receiverBic(req.getReceiverBic())
                .subject(req.getSubject())
                .messageText(req.getMessageText())
                .direction(req.getDirection() != null ? req.getDirection() : "OUTGOING")
                .build();

        message = mt799Repository.save(message);
        log.info("MT799 kaydedildi: id={}, mt700Id={}", message.getId(), req.getMt700Id());

        return toResponse(message);
    }

    @Transactional(readOnly = true)
    public List<Mt799Response> listForCurrentUser() {
        User user = getCurrentUser();
        return mt799Repository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Mt799Response> listByMt700(Long mt700Id) {
        return mt799Repository.findByMt700IdOrderByCreatedAtDesc(mt700Id)
                .stream()
                .map(this::toResponse)
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

    private User getCurrentUser() {
        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new AppException("Kullanıcı bulunamadı", HttpStatus.UNAUTHORIZED));
    }

    private Mt799Response toResponse(Mt799Message m) {
        return Mt799Response.builder()
                .id(m.getId())
                .mt700Id(m.getMt700() != null ? m.getMt700().getId() : null)
                .mt700Reference(m.getMt700() != null ? m.getMt700().getReferenceNumber() : null)
                .referenceNumber(m.getReferenceNumber())
                .senderBic(m.getSenderBic())
                .receiverBic(m.getReceiverBic())
                .subject(m.getSubject())
                .messageText(m.getMessageText())
                .direction(m.getDirection())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
