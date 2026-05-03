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
    // Error: solid, high-contrast — should jump off the page.
    className:
      'bg-red-600 text-white border-red-700 hover:bg-red-600 shadow-sm shadow-red-600/30 dark:bg-red-600 dark:text-white dark:border-red-500',
  },
  Warning: {
    label: 'Warn',
    icon: AlertTriangle,
    className:
      'bg-amber-200 text-amber-900 border-amber-300 hover:bg-amber-200 dark:bg-amber-500/25 dark:text-amber-100 dark:border-amber-500/50',
  },
  Information: {
    label: 'Info',
    icon: Info,
    // Use a fixed semantic blue so the level is theme-independent — otherwise
    // a red `primary` would make Info indistinguishable from Error.
    className:
      'bg-sky-200 text-sky-900 border-sky-300 hover:bg-sky-200 dark:bg-sky-500/25 dark:text-sky-100 dark:border-sky-500/50',
  },
  Info: {
    label: 'Info',
    icon: Info,
    className:
      'bg-sky-200 text-sky-900 border-sky-300 hover:bg-sky-200 dark:bg-sky-500/25 dark:text-sky-100 dark:border-sky-500/50',
  },
  Debug: {
    label: 'Debug',
    icon: Bug,
    className:
      'bg-purple-200 text-purple-900 border-purple-300 hover:bg-purple-200 dark:bg-purple-500/25 dark:text-purple-100 dark:border-purple-500/50',
  },
  Trace: {
    label: 'Trace',
    icon: FileText,
    className:
      'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-200 dark:bg-slate-700/60 dark:text-slate-100 dark:border-slate-600',
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
