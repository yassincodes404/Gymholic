package com.gymholic.calendar;

import com.gymholic.calendar.dto.CalendarEventDto;

import java.time.LocalDateTime;

/**
 * Abstraction for calendar operations.
 */
public interface CalendarService {

    CalendarEventDto createEvent(Long trainerId, String summary, String description,
                                 LocalDateTime start, LocalDateTime end,
                                 String attendeeEmail);

    void updateEvent(Long trainerId, String eventId, String summary, String description,
                     LocalDateTime start, LocalDateTime end);

    void deleteEvent(Long trainerId, String eventId);
}
