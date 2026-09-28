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

type ChoirEvent = 
  | { action: 'login_success', params: { method: 'google' } }
  | { action: 'song_viewed', params: { songId: string, title: string } }
  | { action: 'voice_snippet_played', params: { partType: string, songId: string } }
  | { action: 'voice_snippet_recorded', params: { partType: string, durationSec: number } }
  | { action: 'playlist_activated', params: { playlistId: string, title: string } }
  | { action: 'ai_setlist_curated', params: { theme: string, songCount: number } }
  | { action: 'roster_dispatched', params: { playlistId: string, notifiedCount: number } }
  | { action: 'whatsapp_broadcast_copied', params: { playlistId: string } };

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

export function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
}
