import { apiClient } from './client';

export const paymentApi = {
  create: async (data: { bookingId: number; amount: number; currency: string; provider: string }) => {
    const response = await apiClient.post('/payments', data);
    return response.data;
  },
};
