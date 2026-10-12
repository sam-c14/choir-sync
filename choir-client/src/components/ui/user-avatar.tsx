import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

export interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  textClassName?: string;
}

export function UserAvatar({
  src,
  name,
  email,
  className,
  imageClassName,
  fallbackClassName,
  textClassName,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const getInitial = () => {
    if (name && name.trim()) return name.trim().charAt(0).toUpperCase();
    if (email && email.trim()) return email.trim().charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <div className={cn('relative w-full h-full overflow-hidden rounded-full flex items-center justify-center bg-muted', className)}>
      {src && !hasError ? (
        <img
          src={src}
          alt={name || email || 'User Avatar'}
          referrerPolicy="no-referrer"
          className={cn('w-full h-full object-cover', imageClassName)}
          onError={() => setHasError(true)}
        />
      ) : (
        <div className={cn('w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-bold select-none', fallbackClassName)}>
          <span className={cn('text-xs uppercase', textClassName)}>{getInitial()}</span>
        </div>
      )}
    </div>
  );
}
