import React, { useRef } from 'react';
import { Download, FileText, AlertTriangle } from 'lucide-react';
import type { CallSheetRequest } from '../types/callsheet';
import { UnifiedWorkflowDocument, getPrintStyles } from './UnifiedWorkflowDocument';

interface CallSheetPreviewProps {
  callSheet: Partial<CallSheetRequest>;
}

export const CallSheetPreview: React.FC<CallSheetPreviewProps> = ({ callSheet }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const isCancelled = callSheet.status === 'Cancelled';

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
      {isCancelled && (
        <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-destructive mb-1">CALL SHEET CANCELLED</h2>
              {callSheet.cancellationReason && (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-foreground mb-1">Cancellation Reason:</p>
                  <p className="text-sm text-muted-foreground">{callSheet.cancellationReason}</p>
                </div>
              )}
              {callSheet.cancelledAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Cancelled on: {new Date(callSheet.cancelledAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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

      <div ref={printRef} className={isCancelled ? 'opacity-60' : ''}>
        <UnifiedWorkflowDocument callSheet={callSheet} />
      </div>
    </div>
  );
};
