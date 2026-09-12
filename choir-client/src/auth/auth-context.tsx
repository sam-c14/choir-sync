import React, { createContext, useContext, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { UserRoleEnum, VoicePartTypeEnum } from '@choir-workspace/shared-validation';
import { z } from 'zod';

export interface JwtPayload {
  id: string;
  role: z.infer<typeof UserRoleEnum>;
  leadsVoicePart: z.infer<typeof VoicePartTypeEnum> | null;
}

interface AuthContextType {
  user: JwtPayload | null;
  login: (token: string) => void;
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

  const login = (token: string) => {
    localStorage.setItem('token', token);
    const decoded = jwtDecode<JwtPayload>(token);
    setUser(decoded);
  };

  const logout = () => {
    localStorage.removeItem('token');
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
