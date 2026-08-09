package com.gymholic.booking;

import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    Page<Booking> findByClientId(Long clientId, Pageable pageable);

    Page<Booking> findByTrainerId(Long trainerId, Pageable pageable);

    @Query("SELECT b FROM Booking b WHERE b.trainer.id = :trainerId " +
           "AND b.status IN :statuses " +
           "AND b.startTime >= :start AND b.endTime <= :end")
    List<Booking> findByTrainerAndDateRange(
        @Param("trainerId") Long trainerId,
        @Param("statuses") List<BookingStatus> statuses,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end);

    @Query("SELECT b FROM Booking b WHERE b.status = :status " +
           "AND b.startTime BETWEEN :start AND :end")
    List<Booking> findUpcomingByStatus(
        @Param("status") BookingStatus status,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end);
}
