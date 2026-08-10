import { apiClient } from './client';
import type { CreateBookingRequest, Booking, RescheduleBookingRequest, ApiResponse } from '../types/booking';

/**
 * Booking API client with timezone support.
 * 
 * All times are UTC instants (ISO 8601 with Z suffix).
 * Timezone context is preserved in the booking record.
 */
export const bookingApi = {
  /**
   * Create a new booking.
   * 
   * @param data - Booking details with UTC instants and client timezone
   * @returns Created booking with full timezone context
   */
  create: async (data: CreateBookingRequest): Promise<ApiResponse<Booking>> => {
    const response = await apiClient.post<ApiResponse<Booking>>('/bookings', data);
    return response.data;
  },

  /**
   * Get booking by ID.
   */
  getById: async (id: number): Promise<ApiResponse<Booking>> => {
    const response = await apiClient.get<ApiResponse<Booking>>(`/bookings/${id}`);
    return response.data;
  },

  /**
   * Reschedule an existing booking.
   * 
   * @param id - Booking ID
   * @param data - New times as UTC instants
   */
  reschedule: async (id: number, data: RescheduleBookingRequest): Promise<ApiResponse<Booking>> => {
    const response = await apiClient.put<ApiResponse<Booking>>(`/bookings/${id}/reschedule`, data);
    return response.data;
  },

  /**
   * Cancel a booking.
   * 
   * @param id - Booking ID
   * @param reason - Optional cancellation reason
   */
  cancel: async (id: number, reason?: string): Promise<ApiResponse<Booking>> => {
    const response = await apiClient.put<ApiResponse<Booking>>(`/bookings/${id}/cancel`, { reason });
    return response.data;
  },

  /**
   * Confirm a booking (trainer action).
   */
  confirm: async (id: number): Promise<ApiResponse<Booking>> => {
    const response = await apiClient.put<ApiResponse<Booking>>(`/bookings/${id}/confirm`);
    return response.data;
  },
};
