import { Plus } from 'lucide-react';

interface AddFromStoreCardProps {
  templatesLoaded: boolean;
  availableTemplatesCount: number;
  onClick: () => void;
  /** When true, used as standalone/empty state CTA with larger presentation */
  prominent?: boolean;
}

export function AddFromStoreCard({ 
  templatesLoaded, 
  availableTemplatesCount,
  onClick,
  prominent = false
}: AddFromStoreCardProps) {
  return (
    <button
      type="button"
      className={`group flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 cursor-pointer ${
        prominent ? 'min-h-[280px] py-12 px-8' : 'min-h-[240px] p-6'
      }`}
      onClick={onClick}
    >
      <div className={`flex flex-col items-center gap-3 text-center ${prominent ? 'gap-4' : ''}`}>
        <div className={`flex items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors ${
          prominent ? 'w-16 h-16' : 'w-12 h-12'
        }`}>
          <Plus className={`text-muted-foreground group-hover:text-primary transition-colors ${prominent ? 'h-8 w-8' : 'h-6 w-6'}`} />
        </div>
        <div className="space-y-1">
          <h3 className={`font-medium text-foreground group-hover:text-primary transition-colors ${prominent ? 'text-base' : 'text-sm'}`}>
            {prominent ? 'Browse Agent Templates' : 'Import from Store'}
          </h3>
          <p className={`text-muted-foreground ${prominent ? 'text-sm max-w-sm' : 'text-xs max-w-[200px]'}`}>
            {templatesLoaded 
              ? (availableTemplatesCount > 0 
                  ? `${availableTemplatesCount} agent template${availableTemplatesCount !== 1 ? 's' : ''} available to add`
                  : 'All available templates have been deployed')
              : (prominent ? 'Discover and import new agents for your organization' : 'Browse and add new agents')
            }
          </p>
        </div>
      </div>
    </button>
  );
}
