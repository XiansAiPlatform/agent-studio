import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info, Bug, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogLevel } from '@/app/(dashboard)/settings/logs/types';

interface LogLevelBadgeProps {
  level: LogLevel;
  className?: string;
}

const LOG_LEVEL_CONFIG: Record<LogLevel, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = {
  Error: {
    label: 'Error',
    icon: AlertCircle,
    className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:text-red-200 dark:border-red-900',
  },
  Warning: {
    label: 'Warning',
    icon: AlertTriangle,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-900',
  },
  Information: {
    label: 'Info',
    icon: Info,
    className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900',
  },
  Debug: {
    label: 'Debug',
    icon: Bug,
    className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-900',
  },
  Trace: {
    label: 'Trace',
    icon: FileText,
    className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100 dark:bg-gray-950 dark:text-gray-200 dark:border-gray-900',
  },
};

export function LogLevelBadge({ level, className }: LogLevelBadgeProps) {
  const config = LOG_LEVEL_CONFIG[level];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1 font-medium text-xs px-2 py-0.5',
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {/* {config.label} */}
    </Badge>
  );
}
