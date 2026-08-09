import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [backendStatus, setBackendStatus] = useState<string>('Checking...');
  const [dbStatus, setDbStatus] = useState<string>('Checking...');

  useEffect(() => {
    const checkBackend = async () => {
      const healthUrl = import.meta.env.VITE_HEALTH_URL || '/actuator/health';

      try {
        const response = await fetch(healthUrl);
        if (response.ok) {
          const data = await response.json();
          setBackendStatus(data.status === 'UP' ? '✅ Connected' : '⚠️ Issues Detected');
          
          if (data.components?.db?.status === 'UP') {
            setDbStatus('✅ Connected to PostgreSQL');
          } else {
            setDbStatus('✅ Backend is up, but DB details are hidden in prod profile or down');
          }
        } else {
          setBackendStatus('❌ Failed to connect (HTTP ' + response.status + ')');
          setDbStatus('❌ Unknown');
        }
      } catch {
        setBackendStatus(`❌ Cannot reach backend at ${healthUrl}`);
        setDbStatus('❌ Unknown');
      }
    };

    checkBackend();
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ color: '#10b981' }}>Gymholic Skeleton</h1>
      <p>This is the React frontend running on Vite.</p>
      
      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f3f4f6', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>System Status</h2>
        <ul style={{ listStyleType: 'none', padding: 0, lineHeight: 2 }}>
          <li>
            <strong>Frontend:</strong> ✅ Running (Vite)
          </li>
          <li>
            <strong>Backend (Spring Boot):</strong> {backendStatus}
          </li>
          <li>
            <strong>Database (PostgreSQL):</strong> {dbStatus}
          </li>
        </ul>
      </div>
    </div>
  );
}

export default App;
