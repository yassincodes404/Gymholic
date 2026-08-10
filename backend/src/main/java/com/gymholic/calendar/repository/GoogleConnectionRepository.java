package com.gymholic.calendar.repository;

import com.gymholic.calendar.entity.GoogleConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GoogleConnectionRepository extends JpaRepository<GoogleConnection, Long> {
    Optional<GoogleConnection> findByUserId(Long userId);
    void deleteByUserId(Long userId);
}