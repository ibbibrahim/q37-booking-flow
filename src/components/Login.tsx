import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Video, Monitor, Radio, Eye, EyeOff, Moon, Sun } from 'lucide-react';

import qBusinessLogoDark from '@/assets/Qbusiness_Logo_NEG_POS-01.png';
import qBusinessLogoLight from '@/assets/Qbusiness_Logo_NEG_POS-02.png';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);

    try {
      const userData = await login(username, password);

      let redirectRoute = '/booking';
      if (userData && userData.roles && userData.roles.length > 0) {
        if (userData.roles.includes('Admin')) {
          redirectRoute = '/admin';
        } else if (userData.roles.includes('Booking')) {
          redirectRoute = '/booking';
        } else if (userData.roles.includes('NOC')) {
          redirectRoute = '/noc';
        } else if (userData.roles.includes('Ingest')) {
          redirectRoute = '/ingest';
        }
      }

      navigate(redirectRoute);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 relative">
      <div className="absolute top-6 left-6">
        <Video size={32} className="text-blue-600 dark:text-blue-400 opacity-40" />
      </div>

      <div className="absolute bottom-6 left-6">
        <Radio size={32} className="text-blue-600 dark:text-blue-400 opacity-40" />
      </div>

      <div className="absolute top-6 right-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </Button>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="flex items-center justify-center mb-6">
            <img
              src={isDark ? qBusinessLogoDark : qBusinessLogoLight}
              alt="QBusiness Logo"
              className="h-12"
            />
          </div>

          <div className="text-center mb-8">
            {/* <div className="flex items-center justify-center gap-2 mb-2">
              <Video size={20} className="text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
            </div> */}
            <p className="text-muted-foreground text-sm">
              Sign in to access Resourse Management Dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={18} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your.email@qbusiness.com"
                disabled={isLoading}
                autoComplete="username"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              disabled={isLoading}
            >
              <Video size={18} className="mr-2" />
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* <div className="mt-8 pt-6 border-t border-border">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Video size={24} className="mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                <p className="text-xs text-muted-foreground">Production</p>
              </div>
              <div className="text-center">
                <Monitor size={24} className="mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                <p className="text-xs text-muted-foreground">Broadcasting</p>
              </div>
              <div className="text-center">
                <Radio size={24} className="mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                <p className="text-xs text-muted-foreground">Streaming</p>
              </div>
            </div>
          </div> */}

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              © 2024 QBusiness. All rights reserved.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
