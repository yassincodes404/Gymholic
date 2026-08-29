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
import java.time.LocalDateTime;
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

    /** Pending holds that are stale: their slot already started or checkout was abandoned hours ago. */
    @Query("SELECT b FROM Booking b WHERE b.status = 'PENDING' " +
           "AND (b.startTime < :now OR b.createdAt < :cutoff)")
    List<Booking> findStalePendingBookings(@Param("now") Instant now,
                                           @Param("cutoff") LocalDateTime cutoff);

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

    /**
     * Live (PENDING/CONFIRMED) free time sessions for a trainer starting
     * inside the half-open instant range — backs the one-per-day rule.
     */
    @Query("SELECT b FROM Booking b WHERE b.trainer.id = :trainerId " +
           "AND b.serviceType = com.gymholic.common.enums.BookingServiceType.FREE_SESSION " +
           "AND b.status IN :statuses " +
           "AND b.startTime >= :start AND b.startTime < :end")
    List<Booking> findFreeSessionsStartingBetween(
        @Param("trainerId") Long trainerId,
        @Param("statuses") List<BookingStatus> statuses,
        @Param("start") Instant start,
        @Param("end") Instant end);

    long countByStatus(BookingStatus status);

    List<Booking> findByStatusInAndStartTimeBetweenOrderByStartTimeAsc(
        List<BookingStatus> statuses, Instant start, Instant end);

    @Query("SELECT b.status, COUNT(b) FROM Booking b GROUP BY b.status")
    List<Object[]> countByStatusGrouped();
}
