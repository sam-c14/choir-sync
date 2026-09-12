import React from 'react';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ModeToggle } from '../mode-toggle';

export function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="border-b bg-background shadow-sm sticky top-0 z-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-primary">Choir Sync</h1>
          <Badge variant="outline" className="hidden sm:inline-flex">{user.role}</Badge>
          {user.leadsVoicePart && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {user.leadsVoicePart} Leader
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {user.role.toLowerCase().replace('_', ' ')}
          </span>
          <ModeToggle />
          <Button variant="outline" size="sm" onClick={logout}>Log out</Button>
        </div>
      </div>
    </header>
  );
}
