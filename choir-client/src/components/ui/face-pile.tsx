import React from 'react';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { UserAvatar } from './user-avatar';

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
                <UserAvatar
                  src={user.avatarUrl}
                  name={user.name}
                  email={user.email}
                  textClassName="text-[10px]"
                />
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
