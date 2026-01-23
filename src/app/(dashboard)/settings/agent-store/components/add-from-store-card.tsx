import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card 
      className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50 cursor-pointer border-dashed border-2 hover:bg-primary/5"
      onClick={onClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-center">
          <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center ring-1 ring-primary/10 flex-shrink-0 group-hover:scale-110 transition-transform">
            <Plus className="h-7 w-7 text-primary" />
          </div>
        </div>
        <div className="mt-4 space-y-2 text-center">
          <CardTitle className="text-xl leading-tight group-hover:text-primary transition-colors">
            Onboard more
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {templatesLoaded 
              ? (availableTemplatesCount > 0 
                  ? `${availableTemplatesCount} template${availableTemplatesCount !== 1 ? 's' : ''} available`
                  : 'All templates deployed')
              : 'Import more agents in to your organization'
            }
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>Click to browse</span>
      </CardContent>
    </Card>
  );
}
