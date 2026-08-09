// User Types
export type Role = 'ADMIN' | 'TRAINER' | 'CLIENT';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  profileImageUrl?: string;
  bio?: string;
  active: boolean;
  createdAt: string;
}

// Booking Types
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface Booking {
  id: number;
  clientId: number;
  clientName: string;
  trainerId: number;
  trainerName: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes?: string;
  meetLink?: string;
  createdAt: string;
}

// Availability Types
export interface Availability {
  id: number;
  trainerId: number;
  trainerName: string;
  dayOfWeek?: string;
  startTime: string;
  endTime: string;
  recurring: boolean;
  specificDate?: string;
}

// Payment Types
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: number;
  bookingId: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerName: string;
  checkoutUrl?: string;
  createdAt: string;
}

// Common Types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
