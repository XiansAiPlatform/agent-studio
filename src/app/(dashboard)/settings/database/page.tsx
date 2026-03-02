'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Bot, Loader2 } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { useDatabasePage } from './hooks/use-database-page';
import { FiltersSection } from './components/filters-section';
import { DataTypesPanel } from './components/data-types-panel';
import { RecordsPanel } from './components/records-panel';

function DatabasePageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <DatabasePageHeader
        title="Database"
        subtitle="View and explore data records for your agents"
      />
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading tenant information...</p>
        </div>
      </div>
    </div>
  );
}

function SelectAgentState() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <DatabasePageHeader
        title="Database"
        subtitle="View and explore data records for your agents"
      />
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-lg mb-2">Select an Agent</CardTitle>
          <CardDescription className="text-center">
            Use the sidebar to select an agent to view its data records and activity
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}

function DatabaseContent() {
  const searchParams = useSearchParams();
  const { currentTenantId, isLoading: tenantLoading } = useTenant();
  const agentName = searchParams.get('agentName');
  const activationName = searchParams.get('activationName');

  const page = useDatabasePage({
    currentTenantId,
    tenantLoading,
    agentName,
    activationName,
  });

  if (tenantLoading) {
    return <LoadingState />;
  }

  if (!agentName || !activationName) {
    return <SelectAgentState />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
                <Database className="h-6 w-6 text-primary" />
                Data Explorer
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-muted-foreground">Exploring data for</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
                    <Bot className="h-3 w-3" />
                    {agentName}
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1">
                    {activationName}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-200px)]">
          <div className="lg:col-span-4 space-y-6">
            <FiltersSection
              selectedDateRange={page.selectedDateRange}
              customStartDate={page.customStartDate}
              customEndDate={page.customEndDate}
              onDateRangeChange={page.handleDateRangeChange}
              onCustomDateChange={page.handleCustomDateChange}
            />
            <DataTypesPanel
              types={page.schemaData?.types ?? []}
              isLoading={page.schemaLoading}
              error={page.schemaError}
              selectedDataType={page.selectedDataType}
              hoveredDataType={page.hoveredDataType}
              deletingDataType={page.deletingDataType}
              customStartDate={page.customStartDate}
              customEndDate={page.customEndDate}
              agentName={agentName}
              onDataTypeSelect={page.handleDataTypeSelect}
              onHoverChange={page.setHoveredDataType}
              onDeleteDataType={page.handleDeleteDataType}
            />
          </div>

          <div className="lg:col-span-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border shadow-sm h-full">
              <RecordsPanel
                selectedDataType={page.selectedDataType}
                recordsData={page.recordsData}
                recordsLoading={page.recordsLoading}
                recordsError={page.recordsError}
                currentPage={page.currentPage}
                pageSize={page.pageSize}
                expandedRecords={page.expandedRecords}
                hoveredRecord={page.hoveredRecord}
                deletingRecord={page.deletingRecord}
                onPreviousPage={page.handlePreviousPage}
                onNextPage={page.handleNextPage}
                onToggleRecord={page.toggleRecordExpansion}
                onHoverRecord={page.setHoveredRecord}
                onDeleteRecord={page.handleDeleteRecord}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DatabasePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6 space-y-6">
          <DatabasePageHeader
            title="Database"
            subtitle="View and explore data records for your agents"
          />
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <DatabaseContent />
    </Suspense>
  );
}
