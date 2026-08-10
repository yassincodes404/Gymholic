import { apiClient } from './client';

export const assessmentApi = {
  start: async (data: { userType: string }) => {
    const response = await apiClient.post('/v1/assessments', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/v1/assessments/${id}`, data);
    return response.data;
  },
  submit: async (id: string, data: any) => {
    const response = await apiClient.post(`/v1/assessments/${id}/submit`, data);
    return response.data;
  },
};
