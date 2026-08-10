import { apiClient } from './client';

export const googleApi = {
  connect: async () => {
    const response = await apiClient.get('/integrations/google/connect');
    return response.data; // { data: { url: "..." } }
  },
  status: async () => {
    const response = await apiClient.get('/integrations/google/status');
    return response.data; // { connected: true, googleEmail: "..." }
  },
};
