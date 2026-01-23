import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2 } from 'lucide-react';
import { EnhancedTemplate } from '../types';
import { TemplateCard } from './template-card';

interface StoreSliderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: EnhancedTemplate[];
  isLoading: boolean;
  deployingTemplateId: string | null;
  allExpanded: boolean;
  onToggleExpanded: () => void;
  onDeploy: (template: EnhancedTemplate, event?: React.MouseEvent) => void;
}

export function StoreSliderSheet({
  open,
  onOpenChange,
  templates,
  isLoading,
  deployingTemplateId,
  allExpanded,
  onToggleExpanded,
  onDeploy
}: StoreSliderSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.agent.name.toLowerCase().includes(query) ||
      template.agent.description?.toLowerCase().includes(query) ||
      template.agent.summary?.toLowerCase().includes(query) ||
      template.agent.author?.toLowerCase().includes(query)
    );
  });

  return (
    <Sheet 
      open={open} 
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          setSearchQuery('');
        }
      }}
    >
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span>Agent Store</span>
            <Badge variant="secondary" className="ml-2">
              {templates.length}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Deploy new agents from available templates
          </SheetDescription>
        </SheetHeader>

        {/* Search Box */}
        <div className="px-6 pb-4">
          <Input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="px-6 py-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Loading templates from store...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">All Agents Deployed</h3>
              <p className="text-muted-foreground">
                You&apos;ve deployed all available agent templates
              </p>
            </div>
          ) : filteredTemplates.length === 0 && searchQuery.trim() ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No agents found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search query
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.agent.id}
                  template={template}
                  isDeploying={deployingTemplateId === template.agent.id}
                  isExpanded={allExpanded}
                  onToggleExpanded={onToggleExpanded}
                  onDeploy={(e) => onDeploy(template, e)}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
