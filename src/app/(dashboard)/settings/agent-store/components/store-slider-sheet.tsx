import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2 } from 'lucide-react';
import { EnhancedTemplate } from '../types';
import { TemplateCard } from './template-card';
import { CategoryFilter } from './category-filter';
import { getCategoryLabel, groupByCategory, getUniqueCategories } from '../utils/category-utils';

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const handleToggleExpanded = (templateId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  const searchFilteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter((template) => (
      template.agent.name.toLowerCase().includes(query) ||
      template.agent.description?.toLowerCase().includes(query) ||
      template.agent.summary?.toLowerCase().includes(query) ||
      template.agent.author?.toLowerCase().includes(query) ||
      getCategoryLabel(template.agent.category).toLowerCase().includes(query)
    ));
  }, [templates, searchQuery]);

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === null) return searchFilteredTemplates;
    return searchFilteredTemplates.filter(
      (t) => getCategoryLabel(t.agent.category) === selectedCategory
    );
  }, [searchFilteredTemplates, selectedCategory]);

  const categories = useMemo(() => getUniqueCategories(templates, (t) => t.agent.category), [templates]);
  const countByCategory = useMemo(() => {
    const byCategory = groupByCategory(searchFilteredTemplates, (t) => t.agent.category);
    return Object.fromEntries([...byCategory.entries()].map(([k, v]) => [k, v.length]));
  }, [searchFilteredTemplates]);
  const groupedByCategory = useMemo(
    () => groupByCategory(filteredTemplates, (t) => t.agent.category),
    [filteredTemplates]
  );

  return (
    <Sheet 
      open={open} 
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          setSearchQuery('');
          setSelectedCategory(null);
          setExpandedCards(new Set());
        }
      }}
    >
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span>Available Templates</span>
            <Badge variant="secondary" className="ml-2">
              {templates.length}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Onboard new agents from available templates
          </SheetDescription>
        </SheetHeader>

        {/* Search Box */}
        <div className="px-6 pt-4 pb-4">
          <Input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="px-6 pb-3">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
              countByCategory={countByCategory}
            />
          </div>
        )}

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
            <div className="space-y-6">
              {selectedCategory === null ? (
                // Group by category with section headers when viewing "All"
                [...groupedByCategory.entries()].map(([categoryLabel, categoryTemplates]) => (
                  <div key={categoryLabel} className="space-y-3">
                    <h4 className="text-base font-semibold text-foreground uppercase tracking-wide sticky top-0 py-2 bg-background/95 backdrop-blur-sm -mx-6 px-6 border-b border-slate-200/60 dark:border-slate-700/60">
                      {categoryLabel}
                      <span className="ml-2 text-muted-foreground/80 font-normal">
                        ({categoryTemplates.length})
                      </span>
                    </h4>
                    <div className="space-y-4">
                      {categoryTemplates.map((template) => (
                        <TemplateCard
                          key={template.agent.id}
                          template={template}
                          isDeploying={deployingTemplateId === template.agent.id}
                          isExpanded={expandedCards.has(template.agent.id)}
                          onToggleExpanded={() => handleToggleExpanded(template.agent.id)}
                          onDeploy={(e) => onDeploy(template, e)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                // Flat list when a category is selected
                filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.agent.id}
                    template={template}
                    isDeploying={deployingTemplateId === template.agent.id}
                    isExpanded={expandedCards.has(template.agent.id)}
                    onToggleExpanded={() => handleToggleExpanded(template.agent.id)}
                    onDeploy={(e) => onDeploy(template, e)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
