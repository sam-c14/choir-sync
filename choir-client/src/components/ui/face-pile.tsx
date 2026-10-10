import React from 'react';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface FacePileProps {
  users: { id: string; name?: string | null; email?: string; avatarUrl?: string | null }[];
  max?: number;
  className?: string;
  avatarClassName?: string;
}

export function FacePile({ users, max = 5, className, avatarClassName }: FacePileProps) {
  const displayUsers = users.slice(0, max);
  const remaining = Math.max(0, users.length - max);

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      <TooltipProvider delayDuration={200}>
        {displayUsers.map((user, i) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <div 
                className={cn(
                  "relative w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden hover:z-10 hover:-translate-y-1 transition-transform cursor-pointer",
                  avatarClassName
                )}
                style={{ zIndex: displayUsers.length - i }}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name || ''} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    {(user.name || user.email || 'U').charAt(0)}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{user.name || user.email}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {remaining > 0 && (
          <div className={cn("relative w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center z-0 text-[10px] font-medium", avatarClassName)}>
            +{remaining}
          </div>
        )}
      </TooltipProvider>
    </div>
  );
}
