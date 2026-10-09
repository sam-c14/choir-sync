import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { Music, ListMusic, Shirt, Users, CircleUser } from 'lucide-react';
import { cn } from '../../lib/utils';

export function BottomNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user) return null;

  const isAdminOrDirector = user.role === 'DIRECTOR' || user.role === 'ADMIN';

  const navItems = [
    { name: 'Songs', path: '/', altPath: '/songs', icon: Music },
    { name: 'Playlists', path: '/playlists', icon: ListMusic },
    { name: 'Uniforms', path: '/uniforms', icon: Shirt },
  ];

  if (isAdminOrDirector) {
    navItems.push({ name: 'Users', path: '/admin/users', icon: Users });
  }

  navItems.push({ name: 'Profile', path: '/profile', icon: CircleUser });

  return (
    <nav id="tour-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-50 pb-safe">
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? pathname === '/' || pathname.startsWith('/songs')
              : pathname.startsWith(item.path);

          const Icon = item.icon;

          let id = undefined;
          if (item.name === 'Profile') id = 'tour-profile-nav';
          if (item.name === 'Playlists') id = 'tour-playlists-nav';
          if (item.name === 'Uniforms') id = 'tour-uniforms-nav';
          if (item.name === 'Users') id = 'tour-users-nav';

          return (
            <Link
              key={item.path}
              id={id}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground hover:text-foreground transition-colors",
                isActive && "text-primary"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "fill-primary/20")} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-none">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
