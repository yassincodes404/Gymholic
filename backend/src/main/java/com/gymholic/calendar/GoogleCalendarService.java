package com.gymholic.calendar;

import com.gymholic.calendar.dto.CalendarEventDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Google Calendar integration service.
 * TODO: Integrate with Google Calendar API when OAuth is configured.
 */
@Slf4j
@Service
public class GoogleCalendarService implements CalendarService {

    @Override
    public CalendarEventDto createEvent(String summary, String description,
                                         LocalDateTime start, LocalDateTime end,
                                         String attendeeEmail) {
        log.info("Creating Google Calendar event: {} for {}", summary, attendeeEmail);
        // TODO: Implement Google Calendar API integration
        return CalendarEventDto.builder()
            .summary(summary)
            .description(description)
            .startTime(start)
            .endTime(end)
            .build();
    }

    @Override
    public void deleteEvent(String eventId) {
        log.info("Deleting Google Calendar event: {}", eventId);
        // TODO: Implement Google Calendar API integration
    }
}
