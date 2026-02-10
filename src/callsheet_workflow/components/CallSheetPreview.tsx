import React, { useRef } from 'react';
import { Download, FileText } from 'lucide-react';
import type { CallSheetRequest } from '../types/callsheet';
import { UnifiedWorkflowDocument, getPrintStyles } from './UnifiedWorkflowDocument';

interface CallSheetPreviewProps {
  callSheet: Partial<CallSheetRequest>;
}

export const CallSheetPreview: React.FC<CallSheetPreviewProps> = ({ callSheet }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>QMC Workflow - Unified Forms</title>
          <style>
            ${getPrintStyles()}
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
          <FileText size={20} />
          Unified Workflow Document
        </h3>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Download size={18} />
          Print / Save PDF
        </button>
      </div>

      <div ref={printRef}>
        <UnifiedWorkflowDocument callSheet={callSheet} />
      </div>
    </div>
  );
};
