package com.gymholic.booking;

import com.gymholic.booking.dto.BookingDto;
import com.gymholic.booking.dto.CreateBookingRequest;
import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.BookingStatus;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;

    @Transactional
    public BookingDto createBooking(String clientEmail, CreateBookingRequest request) {
        User client = userRepository.findByEmail(clientEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", clientEmail));

        User trainer = userRepository.findById(request.getTrainerId())
            .orElseThrow(() -> new ResourceNotFoundException("Trainer", "id", request.getTrainerId()));

        if (request.getEndTime().isBefore(request.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }

        // TODO: Check trainer availability before booking

        Booking booking = Booking.builder()
            .client(client)
            .trainer(trainer)
            .startTime(request.getStartTime())
            .endTime(request.getEndTime())
            .notes(request.getNotes())
            .status(BookingStatus.PENDING)
            .build();

        Booking saved = bookingRepository.save(booking);
        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public BookingDto getBookingById(Long id) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));
        return mapToDto(booking);
    }

    @Transactional(readOnly = true)
    public Page<BookingDto> getBookingsByClient(Long clientId, Pageable pageable) {
        return bookingRepository.findByClientId(clientId, pageable).map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public Page<BookingDto> getBookingsByTrainer(Long trainerId, Pageable pageable) {
        return bookingRepository.findByTrainerId(trainerId, pageable).map(this::mapToDto);
    }

    @Transactional
    public BookingDto confirmBooking(Long id) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException("Only pending bookings can be confirmed");
        }

        booking.setStatus(BookingStatus.CONFIRMED);
        return mapToDto(bookingRepository.save(booking));
    }

    @Transactional
    public BookingDto cancelBooking(Long id, String reason) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));

        if (booking.getStatus() == BookingStatus.CANCELLED ||
            booking.getStatus() == BookingStatus.COMPLETED) {
            throw new BadRequestException("Booking cannot be cancelled in its current state");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancellationReason(reason);
        return mapToDto(bookingRepository.save(booking));
    }

    private BookingDto mapToDto(Booking booking) {
        return BookingDto.builder()
            .id(booking.getId())
            .clientId(booking.getClient().getId())
            .clientName(booking.getClient().getFirstName() + " " + booking.getClient().getLastName())
            .trainerId(booking.getTrainer().getId())
            .trainerName(booking.getTrainer().getFirstName() + " " + booking.getTrainer().getLastName())
            .startTime(booking.getStartTime())
            .endTime(booking.getEndTime())
            .status(booking.getStatus())
            .notes(booking.getNotes())
            .meetLink(booking.getMeetLink())
            .createdAt(booking.getCreatedAt())
            .build();
    }
}
