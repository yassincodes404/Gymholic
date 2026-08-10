import { apiClient } from './client';

export interface LoginResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export const authApi = {
  login: async (data: any): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },
  register: async (data: any) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },
  googleSignIn: async (idToken: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/google/signin', { idToken });
    return response.data;
  },
  adminLogin: async (data: any): Promise<LoginResponse> => {
    const response = await apiClient.post('/admin/auth/login', data);
    return response.data;
  },
};
