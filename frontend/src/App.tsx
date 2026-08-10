import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AssessmentPage } from './pages/assessment/AssessmentPage';
import { BookingPage } from './pages/booking/BookingPage';
import { PaymentPage } from './pages/booking/PaymentPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ClientDashboard } from './pages/client/ClientDashboard';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Assessment is public for guest users */}
            <Route path="/assessment" element={<AssessmentPage />} />
          </Route>

          {/* Admin Login (Public, but separate UI) */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Admin/Expert Protected Routes - Require ADMIN or TRAINER role */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'TRAINER']} redirectTo="/admin/login" />}>
            <Route path="/admin" element={<DashboardLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
            </Route>
          </Route>

          {/* Client Protected Routes - Require authentication */}
          <Route element={<ProtectedRoute />}>
            <Route element={<PublicLayout />}>
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/payment" element={<PaymentPage />} />
            </Route>
            
            {/* Client Dashboard */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<ClientDashboard />} />
            </Route>
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
