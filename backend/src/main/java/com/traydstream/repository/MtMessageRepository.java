package com.traydstream.repository;

import com.traydstream.entity.MtMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MtMessageRepository extends JpaRepository<MtMessage, Long> {

    List<MtMessage> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT m FROM MtMessage m WHERE m.user.id = :userId ORDER BY m.createdAt DESC LIMIT 10")
    List<MtMessage> findTop10ByUserId(Long userId);
}
