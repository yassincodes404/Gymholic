package com.gymholic.calendar;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Google Meet link generation service.
 * TODO: Integrate with Google Meet API when OAuth is configured.
 */
@Slf4j
@Service
public class GoogleMeetService {

    public String createMeetLink(String eventId) {
        log.info("Creating Google Meet link for event: {}", eventId);
        // TODO: Implement Google Meet integration
        return null;
    }
}
