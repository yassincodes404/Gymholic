import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { BrandLogo } from '../components/layout/BrandLogo';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-20 flex-col gap-4 py-4 sm:h-20 sm:min-h-0 sm:flex-row sm:items-center sm:justify-between sm:py-0">
            <div className="flex-shrink-0">
              <BrandLogo to="/" subtitle="Fitness business consulting" />
            </div>
            <nav className="flex space-x-4">
              <Link to="/assessment" className="text-muted-foreground hover:text-primary">Start Assessment</Link>
              <Link to="/login" className="text-muted-foreground hover:text-primary">Login</Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>
      <footer className="border-t bg-card py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} Gymholic. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
