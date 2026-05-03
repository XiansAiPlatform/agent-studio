import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info, Bug, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogLevel } from '@/app/(dashboard)/settings/logs/types';

interface LogLevelBadgeProps {
  level: LogLevel | string;
  className?: string;
  /**
   * Whether to show the level icon next to the label. Defaults to `true`.
   * Set to `false` for compact contexts (e.g. stream list rows) where the
   * label alone is enough.
   */
  showIcon?: boolean;
}

const LOG_LEVEL_CONFIG: Record<LogLevel, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = {
  Error: {
    label: 'Error',
    icon: AlertCircle,
    // Outline-only across the board. Error keeps the heaviest weight via a
    // darker, slightly thicker-feeling border to stay prominent without a fill.
    className:
      'bg-transparent text-red-700 border-red-500/70 hover:bg-transparent dark:text-red-300 dark:border-red-400/70',
  },
  Warning: {
    label: 'Warn',
    icon: AlertTriangle,
    className:
      'bg-transparent text-amber-700 border-amber-500/60 hover:bg-transparent dark:text-amber-300 dark:border-amber-400/60',
  },
  Information: {
    label: 'Info',
    icon: Info,
    // Fixed semantic blue (theme-independent) so a red `primary` can never
    // make Info look like Error.
    className:
      'bg-transparent text-sky-700 border-sky-500/60 hover:bg-transparent dark:text-sky-300 dark:border-sky-400/60',
  },
  Info: {
    label: 'Info',
    icon: Info,
    className:
      'bg-transparent text-sky-700 border-sky-500/60 hover:bg-transparent dark:text-sky-300 dark:border-sky-400/60',
  },
  Debug: {
    label: 'Debug',
    icon: Bug,
    className:
      'bg-transparent text-purple-700 border-purple-500/60 hover:bg-transparent dark:text-purple-300 dark:border-purple-400/60',
  },
  Trace: {
    label: 'Trace',
    icon: FileText,
    className:
      'bg-transparent text-slate-600 border-slate-400/70 hover:bg-transparent dark:text-slate-300 dark:border-slate-500/70',
  },
};

export function LogLevelBadge({ level, className, showIcon = true }: LogLevelBadgeProps) {
  // Normalize the level to match our config keys
  // Handle various formats: lowercase, uppercase, etc.
  let normalizedLevel: LogLevel = 'Information';
  
  if (level) {
    const levelStr = String(level);
    const capitalizedLevel = levelStr.charAt(0).toUpperCase() + levelStr.slice(1).toLowerCase() as LogLevel;
    
    // Check if this is a valid log level in our config
    if (capitalizedLevel in LOG_LEVEL_CONFIG) {
      normalizedLevel = capitalizedLevel;
    } else if (level in LOG_LEVEL_CONFIG) {
      normalizedLevel = level as LogLevel;
    }
  }
  
  const config = LOG_LEVEL_CONFIG[normalizedLevel];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5',
        showIcon ? 'justify-start' : 'justify-center',
        'rounded-md px-2 py-0.5',
        'min-w-[68px] sm:min-w-[76px]',
        'text-[11px] font-bold uppercase tracking-wider leading-none',
        // Override the default `[&>svg]:size-3` from the base Badge styles
        // so the level icon reads at a glance.
        '[&>svg]:!size-3.5',
        config.className,
        className
      )}
      aria-label={`${config.label} log`}
    >
      {showIcon && <Icon />}
      <span>{config.label}</span>
    </Badge>
  );
}
