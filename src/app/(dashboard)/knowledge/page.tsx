'use client';

import { Suspense, useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DUMMY_KNOWLEDGE, getKnowledgeById } from '@/lib/data/dummy-knowledge';
import { KnowledgeListItem } from '@/components/features/knowledge/knowledge-list-item';
import { KnowledgeDetail } from '@/components/features/knowledge/knowledge-detail';
import { KnowledgeFiltersComponent, KnowledgeFilters } from '@/components/features/knowledge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

function KnowledgeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedKnowledgeId = searchParams.get('id');
  const selectedArticle = selectedKnowledgeId ? getKnowledgeById(selectedKnowledgeId) : null;

  // Initialize filters from URL params
  const getFiltersFromURL = (): KnowledgeFilters => {
    const formatsParam = searchParams.get('formats');
    const agentsParam = searchParams.get('agents');
    
    return {
      formats: formatsParam ? formatsParam.split(',').filter(f => 
        ['json', 'markdown', 'text'].includes(f)
      ) as KnowledgeFilters['formats'] : [],
      agents: agentsParam ? agentsParam.split(',').filter(a => a.length > 0) : [],
    };
  };

  // Filter state initialized from URL
  const [filters, setFilters] = useState<KnowledgeFilters>(() => getFiltersFromURL());

  // Sync filters from URL when searchParams change (for browser back/forward navigation)
  useEffect(() => {
    const urlFilters = getFiltersFromURL();
    const filtersChanged = 
      JSON.stringify(urlFilters.formats) !== JSON.stringify(filters.formats) ||
      JSON.stringify(urlFilters.agents) !== JSON.stringify(filters.agents);
    
    if (filtersChanged) {
      setFilters(urlFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Update URL when filters change
  const updateFiltersWithURL = (newFilters: KnowledgeFilters) => {
    setFilters(newFilters);
    
    // Build new URL with filter params
    const params = new URLSearchParams(searchParams.toString());
    
    // Update formats
    if (newFilters.formats.length > 0) {
      params.set('formats', newFilters.formats.join(','));
    } else {
      params.delete('formats');
    }
    
    // Update agents
    if (newFilters.agents.length > 0) {
      params.set('agents', newFilters.agents.join(','));
    } else {
      params.delete('agents');
    }
    
    // Preserve the id parameter if present
    const idParam = searchParams.get('id');
    if (idParam) {
      params.set('id', idParam);
    }
    
    // Update URL
    const newURL = params.toString() ? `/knowledge?${params.toString()}` : '/knowledge';
    router.push(newURL, { scroll: false });
  };

  // Extract unique agents from knowledge articles
  const availableAgents = useMemo(() => {
    const agentNames = new Set(DUMMY_KNOWLEDGE.map((kb) => kb.assignedAgent.name));
    return Array.from(agentNames).sort();
  }, []);

  // Filter knowledge articles based on selected filters
  const filteredKnowledge = useMemo(() => {
    return DUMMY_KNOWLEDGE.filter((article) => {
      // Filter by format
      if (filters.formats.length > 0 && !filters.formats.includes(article.format)) {
        return false;
      }
      // Filter by agent
      if (filters.agents.length > 0 && !filters.agents.includes(article.assignedAgent.name)) {
        return false;
      }
      return true;
    });
  }, [filters]);

  const handleArticleClick = (articleId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', articleId);
    router.push(`/knowledge?${params.toString()}`, { scroll: false });
  };

  const handleCloseSlider = () => {
    // Preserve filter params when closing slider
    const params = new URLSearchParams(searchParams.toString());
    params.delete('id');
    const newURL = params.toString() ? `/knowledge?${params.toString()}` : '/knowledge';
    router.push(newURL, { scroll: false });
  };

  const handleEdit = (updatedArticle: any) => {
    console.log('Editing knowledge article:', updatedArticle);
    // TODO: Implement edit logic
  };

  const handleDuplicate = (duplicatedArticle: any) => {
    console.log('Duplicating knowledge article:', duplicatedArticle);
    // TODO: Implement duplicate logic
  };

  const handleDelete = (articleId: string) => {
    console.log('Deleting knowledge article:', articleId);
    // TODO: Implement delete logic
    handleCloseSlider();
  };

  const jsonCount = filteredKnowledge.filter((a) => a.format === 'json').length;
  const markdownCount = filteredKnowledge.filter((a) => a.format === 'markdown').length;
  const textCount = filteredKnowledge.filter((a) => a.format === 'text').length;

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="shrink-0">
            <h1 className="text-3xl font-semibold text-foreground">Knowledge Base</h1>
            <p className="text-muted-foreground mt-1">
              Manage and organize knowledge articles for your agents
            </p>
          </div>
          <div className="flex items-center gap-3">
            <KnowledgeFiltersComponent
              availableAgents={availableAgents}
              filters={filters}
              onFiltersChange={updateFiltersWithURL}
            />
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Article
            </Button>
          </div>
        </div>

        {/* Knowledge Summary Stats */}
        <div className="grid gap-8 md:grid-cols-3 py-4">
          {/* JSON Articles */}
          <div className="group">
            <div className="flex items-baseline gap-3 mb-1.5">
              <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                {jsonCount}
              </div>
              <div className="h-8 w-0.5 bg-primary" />
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground/80">JSON Articles</div>
              <div className="text-xs text-muted-foreground">Structured data</div>
            </div>
          </div>

          {/* Markdown Articles */}
          <div className="group">
            <div className="flex items-baseline gap-3 mb-1.5">
              <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                {markdownCount}
              </div>
              <div className="h-8 w-0.5 bg-accent" />
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground/80">Markdown Articles</div>
              <div className="text-xs text-muted-foreground">Formatted content</div>
            </div>
          </div>

          {/* Text Articles */}
          <div className="group">
            <div className="flex items-baseline gap-3 mb-1.5">
              <div className="text-5xl font-light tabular-nums tracking-tight text-foreground">
                {textCount}
              </div>
              <div className="h-8 w-0.5 bg-muted-foreground/50" />
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground/80">Text Articles</div>
              <div className="text-xs text-muted-foreground">Plain text</div>
            </div>
          </div>
        </div>

        {/* Knowledge Articles List */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle>
              {filteredKnowledge.length === DUMMY_KNOWLEDGE.length
                ? 'All Articles'
                : `Filtered Articles (${filteredKnowledge.length} of ${DUMMY_KNOWLEDGE.length})`}
            </CardTitle>
            <CardDescription>Click on an article to view and edit details</CardDescription>
          </CardHeader>
          <CardContent className="!px-0 !py-0">
            {filteredKnowledge.length > 0 ? (
              filteredKnowledge.map((article) => (
                <KnowledgeListItem
                  key={article.id}
                  article={article}
                  onClick={() => handleArticleClick(article.id)}
                  isSelected={article.id === selectedKnowledgeId}
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-12 px-6">
                No articles match the selected filters
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Detail Slider */}
      <Sheet open={!!selectedArticle} onOpenChange={handleCloseSlider}>
        <SheetContent className="flex flex-col p-0">
          {selectedArticle && (
            <>
              <SheetHeader className="px-6 pt-6">
                <SheetTitle className="text-base">Knowledge Article</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
                <KnowledgeDetail
                  article={selectedArticle}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function KnowledgePage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-6">Loading...</div>}>
      <KnowledgeContent />
    </Suspense>
  );
}
