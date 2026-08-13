package com.traydstream.repository;

import com.traydstream.entity.Mt707Amendment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface Mt707Repository extends JpaRepository<Mt707Amendment, Long> {

    List<Mt707Amendment> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Mt707Amendment> findByMt700IdOrderByCreatedAtDesc(Long mt700Id);
}
