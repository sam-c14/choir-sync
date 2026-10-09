import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../auth/auth-context';
import { RequireAuth } from '../auth/require-auth';
import { Navbar } from '../components/layout/navbar';
import { BottomNav } from '../components/layout/bottom-nav';
import { PlayerProvider } from '../contexts/player-context';
import { GlobalPlayer } from '../components/global-player';
import { ScrollToTop } from '../components/scroll-to-top';
import { BackToTopButton } from '../components/back-to-top-button';
import LoginPage from '../pages/login';
import SongsPage from '../pages/songs';
import SongDetailPage from '../pages/song-detail';
import SongFormPage from '../pages/song-form';
import UniformsPage from '../pages/uniforms';
import AdminUsersPage from '../pages/admin/users';
import PlaylistsPage from '../pages/playlists';
import PlaylistDetailsPage from '../pages/playlist-details';
import { ProfilePage } from '../pages/profile';

import { Toaster } from '../components/ui/sonner';
import { AnalyticsTracker } from '../lib/analytics';
import { FloatingChatTab } from '../components/chat/FloatingChatTab';
import { AppTour } from '../components/onboarding/app-tour';

export function App() {
  return (
    <BrowserRouter>
      <AnalyticsTracker />
      <ScrollToTop />
      <AuthProvider>
        <PlayerProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <div className="min-h-screen bg-background pb-14 md:pb-0">
                    <Navbar />
                    <main>
                      <Routes>
                        <Route path="/" element={<SongsPage />} />
                        <Route path="/songs/new" element={<SongFormPage />} />
                        <Route path="/songs/:id/edit" element={<SongFormPage />} />
                        <Route path="/songs/:id" element={<SongDetailPage />} />
                        <Route path="/uniforms" element={<UniformsPage />} />
                        <Route path="/playlists" element={<PlaylistsPage />} />
                        <Route path="/playlists/:id" element={<PlaylistDetailsPage />} />
                        <Route path="/admin/users" element={<AdminUsersPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </main>
                    <GlobalPlayer />
                    <FloatingChatTab />
                    <AppTour />
                    <Toaster />
                    <BackToTopButton />
                    <BottomNav />
                  </div>
                </RequireAuth>
              }
            />
          </Routes>
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
