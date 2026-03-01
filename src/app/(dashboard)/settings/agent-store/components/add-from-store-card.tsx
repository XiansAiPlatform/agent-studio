import { Plus } from 'lucide-react';

interface AddFromStoreCardProps {
  templatesLoaded: boolean;
  availableTemplatesCount: number;
  onClick: () => void;
}

export function AddFromStoreCard({ 
  templatesLoaded, 
  availableTemplatesCount,
  onClick 
}: AddFromStoreCardProps) {
  return (
    <div 
      className="group py-4 px-6 cursor-pointer transition-all duration-200 bg-slate-50/80 dark:bg-slate-900/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/40"
      onClick={onClick}
    >
      <div className="grid grid-cols-12 gap-6 items-center">
        <div className="col-span-12 flex items-center justify-center">
          <div className="text-center space-y-2">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted group-hover:bg-muted/80 transition-colors">
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            
            {/* Content */}
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                Browse Agent Templates
              </h3>
              <p className="text-xs text-muted-foreground">
                {templatesLoaded 
                  ? (availableTemplatesCount > 0 
                      ? `${availableTemplatesCount} agent template${availableTemplatesCount !== 1 ? 's' : ''} available to add`
                      : 'All available templates have been deployed')
                  : 'Discover and import new agents for your organization'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
