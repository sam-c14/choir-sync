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
        : 'text-gray-300 border-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/20'
    }`;
  };

  return (
    <header className="border-b bg-background shadow-sm sticky top-0 z-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar flex-1 mask-edges py-1">
          <div className="flex items-center gap-2 flex-shrink-0">
            <h1 className="sm:text-xl text-lg font-bold tracking-tight text-primary truncate">CSync</h1>
            <Badge variant="outline" className="hidden sm:inline-flex capitalize">
              {user.role.toLowerCase().replace('_', ' ')}
            </Badge>
            {user.leadsVoicePart && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {user.leadsVoicePart} Leader
              </Badge>
            )}
          </div>
          <nav className="flex items-center gap-2 sm:gap-3 flex-shrink-0 pr-4 sm:pr-0">
            <Link to="/" className={getLinkClass('/', '/songs')}>
              Songs
            </Link>
            <Link to="/playlists" className={getLinkClass('/playlists')}>
              Playlists
            </Link>
            <Link to="/uniforms" className={getLinkClass('/uniforms')}>
              Uniforms
            </Link>
            {user.role === 'DIRECTOR' && (
              <Link to="/admin/users" className={getLinkClass('/admin/users')}>
                Users
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 ml-4 flex-shrink-0">
          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-4">
            <NotificationsPopover />
            <Link to="/profile">
              <span className="text-sm font-medium text-foreground hover:text-primary max-w-[160px] truncate" title={user.name || user.email}>
                {user.name || (user.email?.length > 15 ? `${user.email.slice(0, 15)}...` : user.email)}
              </span>
            </Link>
            <ModeToggle />
            <Button variant="outline" size="sm" onClick={() => setLogoutOpen(true)}>Log out</Button>
          </div>

          {/* Mobile Actions Dropdown */}
          <div className="sm:hidden flex items-center gap-1">
            <NotificationsPopover />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" />
                }
              >
                <Menu className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Open menu</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none truncate" title={user.name || user.email}>
                        {user.name || (user.email?.length > 15 ? `${user.email.slice(0, 15)}...` : user.email)}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">{user.role.toLowerCase().replace('_', ' ')}</p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <Link to="/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>
                    <Laptop className="mr-2 h-4 w-4" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    setLogoutOpen(true); 
                  }} 
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
