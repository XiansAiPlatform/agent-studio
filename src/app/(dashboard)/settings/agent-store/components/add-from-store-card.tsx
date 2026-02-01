import { Plus, Sparkles } from 'lucide-react';

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
      className="group py-8 px-6 cursor-pointer transition-all duration-200 hover:bg-muted/40 border-t border-dashed"
      onClick={onClick}
    >
      <div className="grid grid-cols-12 gap-6 items-center">
        <div className="col-span-12 flex items-center justify-center">
          <div className="text-center space-y-3">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted group-hover:bg-muted/80 transition-colors">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            {/* Content */}
            <div className="space-y-1">
              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                Browse Agent Templates
              </h3>
              <p className="text-sm text-muted-foreground">
                {templatesLoaded 
                  ? (availableTemplatesCount > 0 
                      ? `${availableTemplatesCount} agent template${availableTemplatesCount !== 1 ? 's' : ''} available to add`
                      : 'All available templates have been deployed')
                  : 'Discover and import new agents for your organization'
                }
              </p>
            </div>
            
            {/* Action hint */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Click to explore</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
