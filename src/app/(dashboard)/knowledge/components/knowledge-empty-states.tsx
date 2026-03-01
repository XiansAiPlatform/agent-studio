'use client';

import { Globe, Building2, Zap, BookOpen } from 'lucide-react';

interface KnowledgeEmptyStateProps {
  variant: 'no-context' | 'no-articles';
}

export function KnowledgeEmptyState({ variant }: KnowledgeEmptyStateProps) {
  if (variant === 'no-context') {
    return (
      <div className="text-center space-y-3">
        <div className="flex justify-center gap-3">
          <Globe className="h-8 w-8 text-blue-500/50" />
          <Building2 className="h-8 w-8 text-amber-500/50" />
          <Zap className="h-8 w-8 text-emerald-500/50" />
        </div>
        <h3 className="text-lg font-medium text-foreground">
          View Knowledge Hierarchy
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Enter an agent name and activation name above to see how knowledge
          articles are configured across system, tenant, and activation levels.
        </p>
      </div>
    );
  }

  if (variant === 'no-articles') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 space-y-3">
        <div className="rounded-full bg-muted/50 p-4">
          <BookOpen className="h-7 w-7 text-muted-foreground/60" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">
            No knowledge articles found
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            This agent and activation don&apos;t have any knowledge articles
            configured
          </p>
        </div>
      </div>
    );
  }

  return null;
}
