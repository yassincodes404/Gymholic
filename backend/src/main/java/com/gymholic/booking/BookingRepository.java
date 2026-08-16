package com.gymholic.booking;

import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    Page<Booking> findByClientId(Long clientId, Pageable pageable);
    Page<Booking> findByTrainerId(Long trainerId, Pageable pageable);

    List<Booking> findByClientIdOrderByCreatedAtDesc(Long clientId);

    Optional<Booking> findByRescheduleToken(String rescheduleToken);

    List<Booking> findByStatusAndEndTimeBefore(BookingStatus status, Instant endTime);

    List<Booking> findTop10ByStatusOrderByStartTimeDesc(BookingStatus status);

    long countByStatusAndExpertAttended(BookingStatus status, Boolean expertAttended);

    @Query("SELECT b FROM Booking b WHERE b.trainer.id = :trainerId " +
           "AND b.status IN ('PENDING', 'CONFIRMED') " +
           "AND ((b.startTime < :endTime AND b.endTime > :startTime))")
    List<Booking> findConflictingBookings(@Param("trainerId") Long trainerId, 
                                          @Param("startTime") Instant startTime, 
                                          @Param("endTime") Instant endTime);

    @Query("SELECT b FROM Booking b WHERE b.trainer.id = :trainerId " +
           "AND b.status IN :statuses " +
           "AND b.startTime >= :start AND b.endTime <= :end")
    List<Booking> findByTrainerAndDateRange(
        @Param("trainerId") Long trainerId,
        @Param("statuses") List<BookingStatus> statuses,
        @Param("start") Instant start,
        @Param("end") Instant end);

    @Query("SELECT b FROM Booking b WHERE b.status = :status " +
           "AND b.startTime BETWEEN :start AND :end")
    List<Booking> findUpcomingByStatus(
        @Param("status") BookingStatus status,
        @Param("start") Instant start,
        @Param("end") Instant end);

    long countByStatus(BookingStatus status);

    List<Booking> findByStatusInAndStartTimeBetweenOrderByStartTimeAsc(
        List<BookingStatus> statuses, Instant start, Instant end);

    @Query("SELECT b.status, COUNT(b) FROM Booking b GROUP BY b.status")
    List<Object[]> countByStatusGrouped();
}
