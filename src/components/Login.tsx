import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Radio, Waves, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert } from './ui/alert';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Please enter both email and password');
      return;
    }

    try {
      await login(email, password);
      navigate('/booking');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setLocalError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-3xl font-bold">
                <span className="text-blue-500">Q</span>
                <span className="text-purple-500">B</span>
                <span className="text-blue-500">U</span>
                <span className="text-purple-500">S</span>
                <span className="text-blue-500">I</span>
                <span className="text-purple-500">N</span>
                <span className="text-blue-500">E</span>
                <span className="text-purple-500">S</span>
                <span className="text-blue-500">S</span>
              </span>
            </div>
            <h1 className="text-xl font-semibold text-gray-800 mt-4">Welcome Back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to access your media dashboard</p>
          </div>

          {/* Error Alert */}
          {(error || localError) && (
            <Alert className="mb-6 bg-red-50 border-red-200">
              <p className="text-sm text-red-800">{error || localError}</p>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="your.email@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign in to Media Dashboard'}
            </Button>
          </form>

          {/* Feature Icons */}
          <div className="flex justify-around mt-8 pt-8 border-t border-gray-200">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Radio className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-xs text-gray-600 font-medium">Production</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Waves className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-xs text-gray-600 font-medium">Broadcasting</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Zap className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-xs text-gray-600 font-medium">Streaming</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-xs">
          <p>© 2024 QBusiness. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
