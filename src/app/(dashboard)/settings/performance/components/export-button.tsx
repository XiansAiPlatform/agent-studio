'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MetricsCategoriesResponse } from '../types';

interface ExportButtonProps {
  data: MetricsCategoriesResponse | null;
  isLoading: boolean;
  startDate: string;
  endDate: string;
  selectedAgent: string | null;
  selectedActivation: string | null;
  tenantName?: string;
}

export function ExportButton({
  data,
  isLoading,
  startDate,
  endDate,
  selectedAgent,
  selectedActivation,
  tenantName,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const hasMetrics = Boolean(data && data.summary.totalRecords > 0);
  const isDisabled = isLoading || isExporting || !hasMetrics;

  const handleExport = async () => {
    if (!data) return;

    setIsExporting(true);
    try {
      // Loaded on demand so jsPDF is not part of the page bundle
      const { exportMetricsPdf } = await import('../utils/export-pdf');
      exportMetricsPdf(data, {
        startDate,
        endDate,
        agent: selectedAgent,
        activation: selectedActivation,
        tenantName,
      });
    } catch (err) {
      console.error('[ExportButton] Failed to export metrics:', err);
      toast.error('Failed to export metrics');
    } finally {
      setIsExporting(false);
    }
  };

  const button = (
    <Button variant="outline" className="gap-2" onClick={handleExport} disabled={isDisabled}>
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">Export metrics</span>
    </Button>
  );

  // Disabled buttons don't fire pointer events, so wrap in a span for the tooltip
  if (!isLoading && !hasMetrics) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{button}</span>
          </TooltipTrigger>
          <TooltipContent>No metrics available for the selected period</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
