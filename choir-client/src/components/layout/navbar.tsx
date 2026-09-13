import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ModeToggle } from '../mode-toggle';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

export function Navbar() {
  const { user, logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (!user) return null;

  return (
    <header className="border-b bg-background shadow-sm sticky top-0 z-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-primary">Choir Sync</h1>
            <Badge variant="outline" className="hidden sm:inline-flex">{user.role}</Badge>
            {user.leadsVoicePart && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {user.leadsVoicePart} Leader
              </Badge>
            )}
          </div>
          <nav className="flex items-center space-x-4">
            <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">
              Songs
            </Link>
            <Link to="/uniforms" className="text-sm font-medium transition-colors hover:text-primary">
              Uniforms
            </Link>
            {user.role === 'DIRECTOR' && (
              <Link to="/admin/users" className="text-sm font-medium transition-colors hover:text-primary text-destructive">
                Users
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {user.role.toLowerCase().replace('_', ' ')}
          </span>
          <ModeToggle />
          <Button variant="outline" size="sm" onClick={() => setLogoutOpen(true)}>Log out</Button>
        </div>
      </div>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Out</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Are you sure you want to log out of Choir Sync?
            </p>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setLogoutOpen(false);
                logout();
              }}
            >
              Log out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
