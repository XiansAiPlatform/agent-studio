import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { MetricsCategoriesResponse } from '../types';
import { formatDateRangeDisplay } from './date-helpers';
import { buildReportSections, getReportFileName, REPORT_COLUMNS } from './report-data';

export interface ExportPdfOptions {
  startDate: string;
  endDate: string;
  agent: string | null;
  activation: string | null;
  tenantName?: string;
}

const MARGIN = 14;
const MUTED: [number, number, number] = [110, 110, 110];
const HEADER_FILL: [number, number, number] = [45, 45, 45];

/**
 * Generate the Performance report as a PDF and trigger a download.
 * Loaded on demand (dynamic import) so jsPDF stays out of the page bundle.
 */
export function exportMetricsPdf(data: MetricsCategoriesResponse, options: ExportPdfOptions) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = MARGIN + 4;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Performance Report', MARGIN, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  // date-fns instead of toLocaleString: newer ICU emits U+202F, which jsPDF's built-in fonts can't render
  doc.text(`Generated ${format(new Date(), 'MMM d, yyyy HH:mm')}`, pageWidth - MARGIN, y, { align: 'right' });

  // Report details
  y += 8;
  doc.setFontSize(10);
  const details = [
    options.tenantName ? `Tenant: ${options.tenantName}` : null,
    `Period: ${formatDateRangeDisplay(options.startDate, options.endDate)}`,
    `Agent Template: ${options.agent ?? 'All agents'}   ·   Agent: ${options.activation ?? 'All instances'}`,
  ].filter((line): line is string => line !== null);
  details.forEach((line) => {
    doc.text(line, MARGIN, y);
    y += 5;
  });

  // Summary
  y += 2;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const { totalRecords, totalTypes, totalCategories } = data.summary;
  doc.text(
    `Total Records: ${totalRecords}     Metric Types: ${totalTypes}     Categories: ${totalCategories}`,
    MARGIN,
    y
  );
  y += 6;

  // One table per category
  for (const section of buildReportSections(data)) {
    autoTable(doc, {
      startY: y + 4,
      margin: { left: MARGIN, right: MARGIN },
      head: [
        [
          {
            content: `${section.category}  (${section.totalRecords} ${section.totalRecords === 1 ? 'record' : 'records'})`,
            colSpan: REPORT_COLUMNS.length,
            styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 11 },
          },
        ],
        [...REPORT_COLUMNS],
      ],
      body: section.rows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: HEADER_FILL, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 38 },
        9: { cellWidth: 50 },
      },
      showHead: 'everyPage',
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 8, { align: 'right' });
  }

  doc.save(getReportFileName(options.startDate, options.endDate));
}
