import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from '../components/layout/BrandLogo';

export const DashboardLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-20 flex-col gap-4 py-4 lg:h-20 lg:min-h-0 lg:flex-row lg:items-center lg:justify-between lg:py-0">
            <div className="flex-shrink-0">
              <BrandLogo to="/dashboard" title="Gymholic Admin" subtitle="Operations dashboard" />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/dashboard" className="text-sm font-medium">Dashboard</Link>
              <Link to="/dashboard/availability" className="text-sm text-muted-foreground hover:text-primary">Availability</Link>
              <Link to="/dashboard/settings" className="text-sm text-muted-foreground hover:text-primary">Settings</Link>
              <button 
                onClick={handleLogout}
                className="text-sm text-destructive hover:text-destructive/80"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>
    </div>
  );
};
