import React from 'react';
import { Link } from 'react-router-dom';

export const ClientDashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Consultations</h1>
        <p className="text-muted-foreground mt-2">Manage your upcoming and past sessions.</p>
      </div>

      <div className="bg-card p-6 border rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Upcoming Sessions</h2>
        <div className="text-sm text-muted-foreground text-center py-8 border-dashed border-2 rounded-md">
          You don't have any upcoming consultations.
          <div className="mt-4">
            <Link to="/assessment" className="text-primary hover:underline">Book a new session</Link>
          </div>
        </div>
      </div>

      <div className="bg-card p-6 border rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Past Sessions</h2>
        <div className="text-sm text-muted-foreground text-center py-8 border-dashed border-2 rounded-md">
          No past sessions found.
        </div>
      </div>
    </div>
  );
};
