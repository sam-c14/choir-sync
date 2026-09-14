import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../auth/auth-context';
import { RequireAuth } from '../auth/require-auth';
import { Navbar } from '../components/layout/navbar';
import LoginPage from '../pages/login';
import SongsPage from '../pages/songs';
import SongDetailPage from '../pages/song-detail';
import SongPartsPage from '../pages/song-parts';
import SongFormPage from '../pages/song-form';
import UniformsPage from '../pages/uniforms';
import AdminUsersPage from '../pages/admin/users';

import { Toaster } from '../components/ui/sonner';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <div className="min-h-screen bg-background">
                  <Navbar />
                  <main>
                    <Routes>
                      <Route path="/" element={<SongsPage />} />
                      <Route path="/songs/new" element={<SongFormPage />} />
                      <Route path="/songs/:id/edit" element={<SongFormPage />} />
                      <Route path="/songs/:id" element={<SongDetailPage />} />
                      <Route path="/uniforms" element={<UniformsPage />} />
                      <Route path="/songs/:id/parts" element={<SongPartsPage />} />
                      <Route path="/admin/users" element={<AdminUsersPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                  <Toaster />
                </div>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
