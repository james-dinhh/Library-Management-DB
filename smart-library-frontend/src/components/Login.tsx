import React, { useState } from 'react';
import { BookOpen, User, Lock, Mail } from 'lucide-react';
import { mockUsers } from '../utils/mockData';
import { User as UserType } from '../types';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'user' | 'staff'>('user');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Simple demo authentication
    const user = mockUsers.find(u => u.email === email && u.role === userType);
    
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  const handleDemoLogin = (role: 'user' | 'staff') => {
    const demoUser = mockUsers.find(u => u.role === role);
    if (demoUser) {
      onLogin(demoUser);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="h-12 w-12 text-blue-700" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SmartLibrary</h1>
          <p className="text-gray-600">Welcome to your digital library experience</p>
        </div>

        {/* User Type Selection */}
        <div className="mb-6">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setUserType('user')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                userType === 'user'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Library Member
            </button>
            <button
              type="button"
              onClick={() => setUserType('staff')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                userType === 'staff'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Library Staff
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 py-2 px-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-700 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-800 transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <User className="h-5 w-5" />
            <span>Sign In</span>
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-4">Demo Access:</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleDemoLogin('user')}
              className="py-2 px-4 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Demo User
            </button>
            <button
              onClick={() => handleDemoLogin('staff')}
              className="py-2 px-4 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200"
            >
              Demo Staff
            </button>
          </div>
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>User: john.doe@email.com</p>
            <p>Staff: sarah.johnson@library.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;