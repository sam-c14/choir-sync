import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { UserRoleEnum, VoicePartTypeEnum } from '@choir-workspace/shared-validation';
import { z } from 'zod';
import { apiClient } from '../lib/api-client';
import { toast } from 'sonner';

export interface JwtPayload {
  id: string;
  email: string;
  role: z.infer<typeof UserRoleEnum>;
  leadsVoicePart: z.infer<typeof VoicePartTypeEnum> | null;
  name?: string | null;
  comfortableKey?: string | null;
  participationType?: string;
  hasCompletedOnboarding?: boolean;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: JwtPayload | null;
  login: (token: string, refreshToken: string) => void;
  logout: () => void;
  updateLocalUser: (updates: Partial<JwtPayload>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const PROFILE_STORAGE_KEY = 'user_profile';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (cached) {
        try {
          const profile = JSON.parse(cached);
          return { ...decoded, ...profile };
        } catch {
          // Ignore JSON parse errors
        }
      }
      return decoded;
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      return null;
    }
  });

  const updateLocalUser = useCallback((updates: Partial<JwtPayload>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      try {
        const cached = localStorage.getItem(PROFILE_STORAGE_KEY);
        const currentCache = cached ? JSON.parse(cached) : {};
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ ...currentCache, ...updates }));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  }, []);

  const login = (token: string, refreshToken: string) => {
    toast.dismiss();
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    const decoded = jwtDecode<JwtPayload>(token);
    setUser(decoded);

    apiClient.get('/users/me')
      .then((res) => {
        if (res.data) {
          updateLocalUser({
            name: res.data.name,
            avatarUrl: res.data.avatarUrl,
            comfortableKey: res.data.comfortableKey,
            participationType: res.data.participationType,
            leadsVoicePart: res.data.leadsVoicePart,
          });
        }
      })
      .catch(() => {});
  };

  const logout = async () => {
    toast.dismiss();
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: refreshToken }),
        });
      } catch (_error) {
        // Ignore errors on logout
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    setUser(null);
  };

  // Sync latest user profile on mount to keep avatar and profile updated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    apiClient.get('/users/me')
      .then((res) => {
        if (res.data) {
          updateLocalUser({
            name: res.data.name,
            avatarUrl: res.data.avatarUrl,
            comfortableKey: res.data.comfortableKey,
            participationType: res.data.participationType,
            leadsVoicePart: res.data.leadsVoicePart,
          });
        }
      })
      .catch(() => {
        // Ignore background fetch errors
      });
  }, [updateLocalUser]);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateLocalUser }}>
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
