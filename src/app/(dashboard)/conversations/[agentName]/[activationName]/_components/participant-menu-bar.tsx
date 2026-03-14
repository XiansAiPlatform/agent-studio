'use client';

import { PanelLeft } from 'lucide-react';

export function ParticipantMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background hover:bg-muted/80 transition-colors"
      aria-label="Open conversation menu"
    >
      <PanelLeft className="h-4 w-4" />
    </button>
  );
}

interface ParticipantMenuBarProps {
  onOpenMenu: (() => void) | undefined;
  label: string;
}

export function ParticipantMenuBar({ onOpenMenu, label }: ParticipantMenuBarProps) {
  if (!onOpenMenu) return null;
  return (
    <div className="border-b border-border/50 bg-card px-6 py-3 shrink-0">
      <div className="flex items-center gap-3">
        <ParticipantMenuButton onClick={onOpenMenu} />
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
    </div>
  );
}
