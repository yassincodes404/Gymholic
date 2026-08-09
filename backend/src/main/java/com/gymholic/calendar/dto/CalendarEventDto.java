package com.gymholic.calendar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarEventDto {

    private String eventId;
    private String summary;
    private String description;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String meetLink;
}
