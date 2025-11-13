import React, { createContext, useContext, useEffect, useState } from 'react';

interface UserInfo {
  email: string;
  role: 'Booking' | 'NOC' | 'Ingest' | 'Admin';
  iat?: number;
  exp?: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserInfo | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const decodeToken = (token: string): UserInfo | null => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const decoded = JSON.parse(atob(parts[1]));
      return {
        email: decoded.sub || decoded.email || '',
        role: decoded.role || 'Booking',
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (err) {
      console.error('Failed to decode token:', err);
      return null;
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://localhost:7151/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      const jwtToken = data.token;

      if (!jwtToken) {
        throw new Error('No token received from server');
      }

      const userInfo = decodeToken(jwtToken);
      if (!userInfo) {
        throw new Error('Failed to decode JWT token');
      }

      setToken(jwtToken);
      setUser(userInfo);
      setIsAuthenticated(true);

      localStorage.setItem('auth_token', jwtToken);
      localStorage.setItem('auth_user', JSON.stringify(userInfo));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during login';
      setError(errorMessage);
      setIsAuthenticated(false);
      setToken(null);
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        login,
        logout,
        isLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
