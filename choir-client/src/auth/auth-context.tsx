import React, { createContext, useContext, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { UserRoleEnum, VoicePartTypeEnum } from '@choir-workspace/shared-validation';
import { z } from 'zod';

export interface JwtPayload {
  id: string;
  email: string;
  role: z.infer<typeof UserRoleEnum>;
  leadsVoicePart: z.infer<typeof VoicePartTypeEnum> | null;
}

interface AuthContextType {
  user: JwtPayload | null;
  login: (token: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      localStorage.removeItem('token');
      return null;
    }
  });

  const login = (token: string, refreshToken: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    const decoded = jwtDecode<JwtPayload>(token);
    setUser(decoded);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: refreshToken }),
        });
      } catch (error) {
        // Ignore errors on logout
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
