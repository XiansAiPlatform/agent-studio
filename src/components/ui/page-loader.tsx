import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
  label?: string;
  className?: string;
}

/** Shared full-area loading indicator used across dashboard pages. */
export function PageLoader({ label, className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12',
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </div>
  );
}
