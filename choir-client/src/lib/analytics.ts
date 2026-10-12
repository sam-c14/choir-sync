import ReactGA from 'react-ga4';

export const initAnalytics = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (measurementId) {
    ReactGA.initialize(measurementId);
  }
};

export const trackPageView = (path: string) => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (measurementId) {
    ReactGA.send({ hitType: 'pageview', page: path });
  }
};

/**
 * Call this right after a successful login so all subsequent GA events
 * are associated with the authenticated user in GA4 reports.
 */
export const identifyUser = (userId: string, email?: string, role?: string) => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (measurementId) {
    ReactGA.set({ user_id: userId, user_email: email, user_role: role });
  }
};

type ChoirEvent = 
  | { action: 'login_success', params: { method: 'google', userId: string, email?: string, role?: string } }
  | { action: 'song_viewed', params: { songId: string, title: string, userId?: string } }
  | { action: 'voice_snippet_played', params: { partType: string, songId: string, userId?: string } }
  | { action: 'voice_snippet_recorded', params: { partType: string, durationSec: number, userId?: string } }
  | { action: 'playlist_activated', params: { playlistId: string, title: string, userId?: string } }
  | { action: 'playlist_created', params: { playlistId: string, title: string, userId?: string } }
  | { action: 'reference_track_played', params: { platform: string, title?: string, userId?: string } }
  | { action: 'apk_download_clicked', params: { source: 'login' | 'profile', userId?: string } }
  | { action: 'ai_setlist_curated', params: { theme: string, songCount: number, userId?: string } }
  | { action: 'roster_dispatched', params: { playlistId: string, notifiedCount: number, userId?: string } }
  | { action: 'whatsapp_broadcast_sent', params: { playlistId: string, userId?: string } }
  | { action: 'whatsapp_broadcast_copied', params: { playlistId: string, userId?: string } }
  | { action: 'onboarding_started', params: { userId: string, email: string, role: string } }
  | { action: 'onboarding_completed', params: { userId: string, email: string, role: string } }
  | { action: 'onboarding_skipped', params: { userId: string, email: string, role: string, stepIndex?: number } };

export const trackChoirEvent = (event: ChoirEvent) => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (measurementId) {
    ReactGA.event(event.action, event.params);
  }
};

export const trackException = (description: string, fatal = false) => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (measurementId) {
    ReactGA.event('exception', { description, fatal });
  }
};

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';

export function AnalyticsTracker() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id, user.email, user.role);
    }
  }, [user?.id, user?.email, user?.role]);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
}

