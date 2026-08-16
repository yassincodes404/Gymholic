package com.gymholic.calendar;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventAttendee;
import com.google.api.services.calendar.model.EventDateTime;
import com.gymholic.calendar.dto.CalendarEventDto;
import com.gymholic.calendar.entity.GoogleConnection;
import com.gymholic.calendar.repository.GoogleConnectionRepository;
import com.gymholic.calendar.util.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.Date;

@Service
@Slf4j
@RequiredArgsConstructor
public class GoogleCalendarService implements CalendarService {

    private final GoogleConnectionRepository connectionRepository;
    private final EncryptionUtil encryptionUtil;

    @Value("${google.client.id:}")
    private String clientId;

    @Value("${google.client.secret:}")
    private String clientSecret;

    private Calendar getCalendarService(Long trainerId) throws Exception {
        GoogleConnection connection = connectionRepository.findByUserId(trainerId)
                .orElseThrow(() -> new RuntimeException("Trainer has not connected their Google Calendar."));

        String refreshToken = encryptionUtil.decrypt(connection.getEncryptedRefreshToken());

        NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        GsonFactory jsonFactory = GsonFactory.getDefaultInstance();

        Credential credential = new GoogleCredential.Builder()
                .setTransport(httpTransport)
                .setJsonFactory(jsonFactory)
                .setClientSecrets(clientId, clientSecret)
                .build()
                .setRefreshToken(refreshToken);

        try {
            credential.refreshToken();
        } catch (Exception e) {
            log.error("Failed to refresh Google token for user {}", trainerId, e);
            if (e.getMessage() != null && (e.getMessage().contains("invalid_grant") || e.getMessage().contains("revoked"))) {
                log.warn("Refresh token is invalid or revoked. Removing connection for user {}", trainerId);
                connectionRepository.delete(connection);
                throw new RuntimeException("Google Calendar connection has been revoked. Please reconnect.");
            }
            throw e;
        }

        return new Calendar.Builder(httpTransport, jsonFactory, credential)
                .setApplicationName("GymHolic")
                .build();
    }

    @Override
    public CalendarEventDto createEvent(Long trainerId, String summary, String description,
                                         LocalDateTime start, LocalDateTime end,
                                         String attendeeEmail) {
        log.info("Creating Google Calendar event: {} for {}", summary, attendeeEmail);
        
        try {
            // Get expert's timezone from User entity
            GoogleConnection connection = connectionRepository.findByUserId(trainerId)
                    .orElseThrow(() -> new RuntimeException("Trainer has not connected their Google Calendar."));
            
            ZoneId expertZone = connection.getUser().getZoneId();
            log.info("Using expert timezone: {} for trainerId: {}", expertZone, trainerId);
            
            Calendar service = getCalendarService(trainerId);

            Event event = new Event()
                .setSummary(summary)
                .setDescription(description);

            // Create event times in expert's timezone
            DateTime startDateTime = new DateTime(Date.from(start.atZone(expertZone).toInstant()));
            EventDateTime startEventDateTime = new EventDateTime()
                .setDateTime(startDateTime)
                .setTimeZone(expertZone.getId());
            event.setStart(startEventDateTime);

            DateTime endDateTime = new DateTime(Date.from(end.atZone(expertZone).toInstant()));
            EventDateTime endEventDateTime = new EventDateTime()
                .setDateTime(endDateTime)
                .setTimeZone(expertZone.getId());
            event.setEnd(endEventDateTime);

            EventAttendee attendee = new EventAttendee().setEmail(attendeeEmail);
            event.setAttendees(Collections.singletonList(attendee));

            // Setup Meet link creation request
            event.setConferenceData(new com.google.api.services.calendar.model.ConferenceData()
                    .setCreateRequest(new com.google.api.services.calendar.model.CreateConferenceRequest()
                            .setRequestId(java.util.UUID.randomUUID().toString())
                            .setConferenceSolutionKey(new com.google.api.services.calendar.model.ConferenceSolutionKey().setType("hangoutsMeet"))));

            // Insert into primary calendar. sendUpdates=all makes Google email
            // the attendee (the client) a real calendar invitation from Gmail,
            // so they see themselves on the meeting in their own calendar.
            Event createdEvent = service.events().insert("primary", event)
                    .setConferenceDataVersion(1) // Required to generate meet link
                    .setSendUpdates("all")
                    .execute();

            String meetLink = null;
            if (createdEvent.getConferenceData() != null && !createdEvent.getConferenceData().getEntryPoints().isEmpty()) {
                meetLink = createdEvent.getConferenceData().getEntryPoints().get(0).getUri();
            }

            return CalendarEventDto.builder()
                .eventId(createdEvent.getId())
                .summary(summary)
                .description(description)
                .startTime(start)
                .endTime(end)
                .meetLink(meetLink)
                .build();

        } catch (Exception e) {
            log.error("Failed to create Google Calendar Event", e);
            throw new RuntimeException("Failed to create event in Google Calendar", e);
        }
    }

    @Override
    public void updateEvent(Long trainerId, String eventId, String summary, String description,
                            LocalDateTime start, LocalDateTime end) {
        log.info("Updating Google Calendar event: {}", eventId);
        try {
            // Get expert's timezone
            GoogleConnection connection = connectionRepository.findByUserId(trainerId)
                    .orElseThrow(() -> new RuntimeException("Trainer has not connected their Google Calendar."));
            
            ZoneId expertZone = connection.getUser().getZoneId();
            
            Calendar service = getCalendarService(trainerId);
            Event event = service.events().get("primary", eventId).execute();

            if (summary != null) event.setSummary(summary);
            if (description != null) event.setDescription(description);

            DateTime startDateTime = new DateTime(Date.from(start.atZone(expertZone).toInstant()));
            event.setStart(new EventDateTime()
                .setDateTime(startDateTime)
                .setTimeZone(expertZone.getId()));

            DateTime endDateTime = new DateTime(Date.from(end.atZone(expertZone).toInstant()));
            event.setEnd(new EventDateTime()
                .setDateTime(endDateTime)
                .setTimeZone(expertZone.getId()));

            // sendUpdates=all → Google notifies the attendee by email about the new time.
            service.events().update("primary", eventId, event).setSendUpdates("all").execute();
        } catch (Exception e) {
            log.error("Failed to update Google Calendar Event", e);
            throw new RuntimeException("Failed to update event", e);
        }
    }

    @Override
    public void deleteEvent(Long trainerId, String eventId) {
        log.info("Deleting Google Calendar event: {}", eventId);
        try {
            Calendar service = getCalendarService(trainerId);
            service.events().delete("primary", eventId).execute();
        } catch (Exception e) {
            log.error("Failed to delete Google Calendar Event", e);
            throw new RuntimeException("Failed to delete event", e);
        }
    }
}
