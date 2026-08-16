package com.gymholic.dashboard;

import com.gymholic.booking.BookingRepository;
import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.BookingStatus;
import com.gymholic.common.enums.PaymentStatus;
import com.gymholic.payment.PaymentRepository;
import com.gymholic.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardStats() {
        Instant now = Instant.now();
        ZoneId utc = ZoneId.of("UTC");
        Instant startOfDay = LocalDate.now(utc).atStartOfDay(utc).toInstant();
        Instant endOfDay = startOfDay.plusSeconds(86_400);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalBookings", bookingRepository.count());

        List<Booking> todaysBookings = bookingRepository
            .findByStatusInAndStartTimeBetweenOrderByStartTimeAsc(
                List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED), startOfDay, endOfDay);
        stats.put("todaysConsultations", todaysBookings.size());

        List<Booking> upcoming = bookingRepository
            .findByStatusInAndStartTimeBetweenOrderByStartTimeAsc(
                List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED), endOfDay, endOfDay.plusSeconds(30L * 86_400));
        stats.put("upcomingConsultations", upcoming.size());

        long completed = bookingRepository.countByStatus(BookingStatus.COMPLETED);
        long cancelled = bookingRepository.countByStatus(BookingStatus.CANCELLED);
        long total = bookingRepository.count();
        stats.put("completedSessions", completed);
        stats.put("cancelledBookings", cancelled);
        stats.put("cancellationRate", total == 0 ? 0.0 : Math.round(cancelled * 1000.0 / total) / 10.0);

        stats.put("revenue", paymentRepository.sumAmountByStatus(PaymentStatus.COMPLETED)
            .orElse(BigDecimal.ZERO));

        stats.put("todaysBookings", toSummaries(todaysBookings));
        stats.put("upcomingBookings", toSummaries(upcoming.stream().limit(20).toList()));

        // No-show tracking: how many missed sessions, how many were the
        // expert's fault (refund due), and the most recent ones to act on.
        List<Booking> noShows = bookingRepository.findTop10ByStatusOrderByStartTimeDesc(BookingStatus.NO_SHOW);
        stats.put("noShows", bookingRepository.countByStatus(BookingStatus.NO_SHOW));
        stats.put("refundDue",
            bookingRepository.countByStatusAndExpertAttended(BookingStatus.NO_SHOW, false));
        stats.put("recentNoShows", noShows.stream().map(b -> {
            Map<String, Object> item = new HashMap<>();
            item.put("id", b.getId());
            item.put("clientName", b.getClient().getFirstName() + " " + b.getClient().getLastName());
            item.put("clientEmail", b.getClient().getEmail());
            item.put("startTime", b.getStartTime().toString());
            item.put("expertAttended", b.getExpertAttended());
            item.put("refundDue", Boolean.FALSE.equals(b.getExpertAttended()));
            item.put("rescheduleCount", b.getRescheduleCount());
            return item;
        }).toList());

        return stats;
    }

    private List<Map<String, Object>> toSummaries(List<Booking> bookings) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Booking b : bookings) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", b.getId());
            item.put("startTime", b.getStartTime().toString());
            item.put("clientName", b.getClient().getFirstName() + " " + b.getClient().getLastName());
            item.put("clientEmail", b.getClient().getEmail());
            item.put("status", b.getStatus().name());
            item.put("meetLink", b.getMeetLink());
            result.add(item);
        }
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAnalytics() {
        Map<String, Object> analytics = new HashMap<>();

        // Revenue per day, last 14 days
        List<Object[]> rows = paymentRepository.sumCompletedRevenueByDay(
            java.time.LocalDateTime.now(ZoneId.of("UTC")).minusDays(14));
        List<Map<String, Object>> revenueByDay = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> point = new HashMap<>();
            point.put("date", String.valueOf(row[0]));
            point.put("total", ((java.math.BigDecimal) row[1]).doubleValue());
            revenueByDay.add(point);
        }
        analytics.put("revenueByDay", revenueByDay);

        // Bookings by status
        Map<String, Long> bookingsByStatus = new HashMap<>();
        for (Object[] row : bookingRepository.countByStatusGrouped()) {
            bookingsByStatus.put(((BookingStatus) row[0]).name(), (Long) row[1]);
        }
        analytics.put("bookingsByStatus", bookingsByStatus);

        return analytics;
    }
}
