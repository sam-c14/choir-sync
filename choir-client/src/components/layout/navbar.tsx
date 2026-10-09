import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ModeToggle } from '../mode-toggle';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup } from '../ui/dropdown-menu';
import { Menu, Moon, Sun, Laptop, LogOut, User } from 'lucide-react';
import { useTheme } from '../theme-provider';
import { NotificationsPopover } from './notifications-popover';
import { GlobalSearch } from './global-search';

export function Navbar() {
  const { user, logout } = useAuth();
  const { setTheme } = useTheme();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { pathname } = useLocation();

  if (!user) return null;

  const getLinkClass = (path: string, altPath?: string) => {
    const isActive = path === '/' ? pathname === '/' || (altPath && pathname.startsWith(altPath)) : pathname.startsWith(path) || (altPath && pathname.startsWith(altPath));
    return `text-sm font-medium transition-all rounded-md py-1 pb-1.5 px-3 whitespace-nowrap border ${
      isActive 
        ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
        : 'text-gray-600 dark:text-gray-300 border-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/20'
    }`;
  };

  return (
    <header className="border-b bg-background shadow-sm sticky top-0 z-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar flex-1 mask-edges py-1">
          <div className="flex items-center gap-2 flex-shrink-0">
            <h1 className="text-xl font-bold tracking-tight text-primary truncate">CSync</h1>
            <Badge variant="outline" className="hidden md:inline-flex capitalize">
              {user.role.toLowerCase().replace('_', ' ')}
            </Badge>
            {user.leadsVoicePart && (
              <Badge variant="secondary" className="hidden md:inline-flex">
                {user.leadsVoicePart} Leader
              </Badge>
            )}
          </div>
          <nav className="hidden md:flex items-center gap-3 flex-shrink-0">
            <Link to="/" className={getLinkClass('/', '/songs')}>
              Songs
            </Link>
            <Link to="/playlists" className={getLinkClass('/playlists')}>
              Playlists
            </Link>
            <Link to="/uniforms" className={getLinkClass('/uniforms')}>
              Uniforms
            </Link>
            {(user.role === 'DIRECTOR' || user.role === 'ADMIN') && (
              <Link to="/admin/users" className={getLinkClass('/admin/users')}>
                Users
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2 md:gap-4 ml-4 flex-shrink-0">
          <GlobalSearch />
          <NotificationsPopover />
          <div className="md:hidden">
            <ModeToggle />
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/profile">
              <span className="text-sm font-medium text-foreground hover:text-primary max-w-[160px] truncate" title={user.name || user.email}>
                {user.name || (user.email?.length > 15 ? `${user.email.slice(0, 15)}...` : user.email)}
              </span>
            </Link>
            <ModeToggle />
            <Button variant="outline" size="sm" onClick={() => setLogoutOpen(true)}>Log out</Button>
          </div>
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
