package com.traydstream.repository;

import com.traydstream.entity.Mt745Claim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface Mt745Repository extends JpaRepository<Mt745Claim, Long> {

    List<Mt745Claim> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Mt745Claim> findByMt700IdOrderByCreatedAtDesc(Long mt700Id);
}
