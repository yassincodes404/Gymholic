package com.gymholic.calendar;

import com.gymholic.calendar.dto.CalendarEventDto;

import java.time.LocalDateTime;

/**
 * Abstraction for calendar operations.
 */
public interface CalendarService {

    CalendarEventDto createEvent(String summary, String description,
                                 LocalDateTime start, LocalDateTime end,
                                 String attendeeEmail);

    void deleteEvent(String eventId);
}
