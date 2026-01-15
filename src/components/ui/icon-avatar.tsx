'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export type IconAvatarVariant = 
  | 'agent' 
  | 'user' 
  | 'json' 
  | 'markdown' 
  | 'text'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'muted';

export type IconAvatarSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<IconAvatarVariant, string> = {
  agent: 'bg-primary/10 text-primary',
  user: 'bg-secondary/10 text-secondary-foreground',
  json: 'bg-primary/10 text-primary',
  markdown: 'bg-accent/10 text-accent',
  text: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  accent: 'bg-accent/10 text-accent',
  muted: 'bg-muted text-muted-foreground',
};

const sizeStyles: Record<IconAvatarSize, { container: string; icon: string }> = {
  sm: { container: 'h-8 w-8', icon: 'h-4 w-4' },
  md: { container: 'h-10 w-10', icon: 'h-5 w-5' },
  lg: { container: 'h-12 w-12', icon: 'h-6 w-6' },
};

interface IconAvatarProps {
  icon: LucideIcon;
  variant?: IconAvatarVariant;
  size?: IconAvatarSize;
  className?: string;
  iconClassName?: string;
  rounded?: 'full' | 'md' | 'lg';
}

export function IconAvatar({
  icon: Icon,
  variant = 'primary',
  size = 'md',
  className,
  iconClassName,
  rounded = 'full',
}: IconAvatarProps) {
  const roundedClass = {
    full: 'rounded-full',
    md: 'rounded-md',
    lg: 'rounded-lg',
  }[rounded];

  return (
    <div
      className={cn(
        'flex items-center justify-center shrink-0',
        sizeStyles[size].container,
        variantStyles[variant],
        roundedClass,
        className
      )}
    >
      <Icon className={cn(sizeStyles[size].icon, iconClassName)} />
    </div>
  );
}
