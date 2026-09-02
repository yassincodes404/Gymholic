package com.gymholic.support;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SupportMessageRepository extends JpaRepository<SupportMessage, Long> {

    List<SupportMessage> findByStatusOrderByCreatedAtDesc(String status);

    List<SupportMessage> findAllByOrderByCreatedAtDesc();

    long countByEmailAndCreatedAtAfter(String email, LocalDateTime after);
}
