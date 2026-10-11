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
    <nav
      id="tour-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 dark:border-white/10 bg-background/80 dark:bg-background/80 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/70 shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_24px_-2px_rgba(0,0,0,0.4)] pb-safe pb-[env(safe-area-inset-bottom,0px)] transition-colors"
    >
      {/* Specular top highlight for glass bevel */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 dark:via-white/10 to-transparent pointer-events-none" />

      <div className="flex items-center justify-around h-16 py-1 px-1">
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? pathname === '/' || pathname.startsWith('/songs')
              : pathname.startsWith(item.path);

          const Icon = item.icon;

          let id = undefined;
          if (item.name === 'Songs') id = 'tour-songs-nav';
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
                "flex flex-col items-center justify-center w-full h-full py-1 space-y-1 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-150 active:scale-95",
                isActive && "text-primary"
              )}
            >
              {item.name === 'Profile' && (user as any)?.avatarUrl ? (
                <div
                  className={cn(
                    "w-6 h-6 rounded-full overflow-hidden border-2 transition-all",
                    isActive ? "border-primary ring-2 ring-primary/20 scale-105" : "border-border/60"
                  )}
                >
                  <img src={(user as any).avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={cn("transition-transform duration-150", isActive && "scale-105")}>
                  <Icon
                    className={cn("w-5 h-5 transition-colors", isActive && "fill-primary/20")}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
              )}
              <span className={cn("text-[11px] leading-none transition-colors", isActive ? "font-semibold text-primary" : "font-medium")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
