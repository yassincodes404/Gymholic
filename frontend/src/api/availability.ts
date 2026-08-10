import { apiClient } from './client';
import type { AvailableSlot, ApiResponse } from '../types/booking';

/**
 * Availability API client with timezone support.
 * 
 * The availability endpoint requires the client's timezone
 * and returns slots converted to that timezone.
 */
export const availabilityApi = {
  /**
   * Get available consultation slots for a trainer on a specific date.
   * 
   * The backend will:
   * 1. Generate slots in the expert's timezone
   * 2. Convert them to the client's timezone
   * 3. Return both times for transparency
   * 
   * @param trainerId - Expert/trainer ID
   * @param date - Date in YYYY-MM-DD format (client's local date)
   * @param clientTimezone - Client's IANA timezone ID (e.g., "Asia/Dubai")
   * @returns List of available slots with full timezone context
   */
  getSlots: async (
    trainerId: number,
    date: string,
    clientTimezone: string
  ): Promise<ApiResponse<AvailableSlot[]>> => {
    const response = await apiClient.get<ApiResponse<AvailableSlot[]>>(
      `/availability/trainer/${trainerId}/slots`,
      {
        params: { date, clientTimezone },
      }
    );
    return response.data;
  },

  /**
   * Create availability (trainer action).
   */
  create: async (data: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>('/availability', data);
    return response.data;
  },
};
