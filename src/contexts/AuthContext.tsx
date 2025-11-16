import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../utils/apiClient';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

interface User {
  username: string;
  roles: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setIsAuthenticated(true);

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      } catch (error) {
        console.error('Failed to restore auth state:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await apiClient.post('api/users/login', {
        username,
        password
      });

      const { token: receivedToken } = response.data;

      const payload = JSON.parse(atob(receivedToken.split('.')[1]));
      const userRole = payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

      const userData: User = {
        username: payload.unique_name || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || username,
        role: userRole
      };

      localStorage.setItem('auth_token', receivedToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));

      setToken(receivedToken);
      setUser(userData);
      setIsAuthenticated(true);

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.response?.data?.message || 'Invalid username or password');
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');

    setToken(null);
    setUser(null);
    setIsAuthenticated(false);

    delete apiClient.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        login,
        logout,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
