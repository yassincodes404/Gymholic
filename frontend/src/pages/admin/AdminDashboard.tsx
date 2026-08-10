import React, { useEffect, useState } from 'react';
import { googleApi } from '../../api/google';

export const AdminDashboard: React.FC = () => {
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean, googleEmail?: string } | null>(null);

  useEffect(() => {
    checkGoogleStatus();
  }, []);

  const checkGoogleStatus = async () => {
    try {
      const response = await googleApi.status();
      setGoogleStatus(response.data);
    } catch (err) {
      console.error('Failed to check Google status', err);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const response = await googleApi.connect();
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      console.error('Failed to get Google connect URL', err);
      alert('Could not connect to Google Calendar');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage your consultations and settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Integrations</h2>
          
          <div className="flex items-center justify-between p-4 border rounded-md bg-background">
            <div>
              <h3 className="font-medium">Google Calendar</h3>
              <p className="text-sm text-muted-foreground">
                {googleStatus?.connected ? `Connected as ${googleStatus.googleEmail}` : 'Not connected'}
              </p>
            </div>
            
            {!googleStatus?.connected ? (
              <button 
                onClick={handleConnectGoogle}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium"
              >
                Connect
              </button>
            ) : (
              <span className="text-green-600 bg-green-100 px-3 py-1 rounded-full text-xs font-semibold">
                Active
              </span>
            )}
          </div>
        </div>

        <div className="bg-card p-6 border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Recent Bookings</h2>
          <div className="text-sm text-muted-foreground text-center py-8 border-dashed border-2 rounded-md">
            No recent bookings found.
          </div>
        </div>
      </div>
    </div>
  );
};
