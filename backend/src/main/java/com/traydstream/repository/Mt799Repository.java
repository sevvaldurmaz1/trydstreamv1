package com.traydstream.repository;

import com.traydstream.entity.Mt799Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface Mt799Repository extends JpaRepository<Mt799Message, Long> {

    List<Mt799Message> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Mt799Message> findByMt700IdOrderByCreatedAtDesc(Long mt700Id);
}
