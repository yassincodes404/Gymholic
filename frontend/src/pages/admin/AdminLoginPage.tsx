import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/auth';
import { BrandLogo } from '../../components/layout/BrandLogo';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await authApi.adminLogin({ email, password });
      if (response.data?.accessToken) {
        const { accessToken, userId, email, firstName, lastName, role } = response.data;
        
        // Verify that user has ADMIN or TRAINER role
        if (role !== 'ADMIN' && role !== 'TRAINER') {
          setError('Access denied. Admin or Expert credentials required.');
          return;
        }

        login(accessToken, {
          userId,
          email,
          firstName,
          lastName,
          role
        });
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4 bg-card p-8 border rounded-lg shadow-sm">
        <div className="text-center mb-6">
          <div className="mb-5 flex justify-center">
            <BrandLogo title="Gymholic Admin" subtitle="Secure team access" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Admin Portal</h1>
          <p className="text-sm text-muted-foreground">Sign in to access the admin dashboard</p>
        </div>
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border px-3 py-2 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="admin@gymholic.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border px-3 py-2 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In to Admin'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="text-primary hover:underline">← Back to main site</Link>
        </div>
      </div>
    </div>
  );
};
