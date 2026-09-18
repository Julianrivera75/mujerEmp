import React from 'react';
import AvatarImage from '@/components/AvatarImage';
import { cn } from '@/lib/cn';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLS: Record<Size, string> = {
  sm: 'w-8 h-8 text-xs rounded-xl',
  md: 'w-11 h-11 text-sm rounded-2xl',
  lg: 'w-20 h-20 text-2xl rounded-3xl',
  xl: 'w-28 h-28 text-3xl rounded-3xl',
};

interface AvatarProps {
  avatarKey?: string | null;
  fallbackInitial: string;
  size?: Size;
  ring?: boolean;
  className?: string;
}

export function Avatar({ avatarKey, fallbackInitial, size = 'md', ring, className }: AvatarProps) {
  return (
    <div className={cn(ring && 'p-0.5 rounded-[inherit] bg-gradient-to-tr from-role-from to-role-to shadow-glow inline-block')}>
      <AvatarImage
        avatarKey={avatarKey}
        fallbackInitial={fallbackInitial}
        className={cn(SIZE_CLS[size], 'font-black', ring && 'ring-2 ring-white', className)}
      />
    </div>
  );
}
