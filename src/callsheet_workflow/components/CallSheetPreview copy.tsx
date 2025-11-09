import React, { useRef } from 'react';
import { Download, FileText } from 'lucide-react';
import type { CallSheetRequest } from '../types/callsheet';

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

    printWindow.document.write(`
      <html>
        <head>
          <title>Call Sheet - ${callSheet.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            h2 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #000; }
            h3 { font-size: 16px; margin-top: 15px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .info-grid { display: grid; grid-template-columns: 150px 1fr; gap: 8px; margin-bottom: 10px; }
            .info-label { font-weight: bold; }
            .section { margin-bottom: 20px; page-break-inside: avoid; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

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
          Call Sheet Preview
        </h3>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Download size={18} />
          Print / Save PDF
        </button>
      </div>

      <div ref={printRef} className="bg-card rounded-lg border border-border p-8 space-y-6">
        <div className="border-b border-border pb-4">
          <h1 className="text-2xl font-bold text-card-foreground">Call Sheet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <div className="section">
          <h2 className="text-xl font-semibold text-card-foreground border-b border-border pb-2 mb-4">
            Booking Information
          </h2>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold text-card-foreground">Department:</span>
                <span className="ml-2 text-muted-foreground">{callSheet.department || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-card-foreground">Title:</span>
                <span className="ml-2 text-muted-foreground">{callSheet.title || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-card-foreground">Filming Date:</span>
                <span className="ml-2 text-muted-foreground">{callSheet.filmingDate || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-card-foreground">Location:</span>
                <span className="ml-2 text-muted-foreground">{callSheet.location || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-card-foreground">Call Time:</span>
                <span className="ml-2 text-muted-foreground">{callSheet.callTime || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-card-foreground">Wrap Time:</span>
                <span className="ml-2 text-muted-foreground">{callSheet.wrapTime || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-card-foreground">Focal Point:</span>
                <span className="ml-2 text-muted-foreground">{callSheet.focalPoint || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-card-foreground">Contact:</span>
                <span className="ml-2 text-muted-foreground">{callSheet.focalPointContact || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {callSheet.crewAssignments && callSheet.crewAssignments.length > 0 && (
          <div className="section">
            <h2 className="text-xl font-semibold text-card-foreground border-b border-border pb-2 mb-4">
              Crew Assignments
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="px-4 py-2 text-left text-card-foreground">Role</th>
                  <th className="px-4 py-2 text-left text-card-foreground">Name</th>
                  <th className="px-4 py-2 text-left text-card-foreground">Phone</th>
                </tr>
              </thead>
              <tbody>
                {callSheet.crewAssignments.map((crew) => (
                  <tr key={crew.id} className="border-t border-border">
                    <td className="px-4 py-2 text-card-foreground">{crew.role}</td>
                    <td className="px-4 py-2 text-card-foreground">{crew.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{crew.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {callSheet.equipment && callSheet.equipment.length > 0 && (
          <div className="section">
            <h2 className="text-xl font-semibold text-card-foreground border-b border-border pb-2 mb-4">
              Equipment List
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="px-4 py-2 text-left text-card-foreground">Category</th>
                  <th className="px-4 py-2 text-left text-card-foreground">Item</th>
                  <th className="px-4 py-2 text-left text-card-foreground">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {callSheet.equipment.map((eq) => (
                  <tr key={eq.id} className="border-t border-border">
                    <td className="px-4 py-2 text-card-foreground">{eq.category}</td>
                    <td className="px-4 py-2 text-card-foreground">{eq.item}</td>
                    <td className="px-4 py-2 text-muted-foreground">{eq.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {callSheet.transportRequest && (
          <div className="section">
            <h2 className="text-xl font-semibold text-card-foreground border-b border-border pb-2 mb-4">
              Transportation Request
            </h2>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold text-card-foreground">Reason:</span>
                  <span className="ml-2 text-muted-foreground">{callSheet.transportRequest.reason}</span>
                </div>
                <div>
                  <span className="font-semibold text-card-foreground">Driver:</span>
                  <span className="ml-2 text-muted-foreground">{callSheet.transportRequest.driverName}</span>
                </div>
                <div>
                  <span className="font-semibold text-card-foreground">Vehicle No:</span>
                  <span className="ml-2 text-muted-foreground">{callSheet.transportRequest.vehicleNo}</span>
                </div>
                <div>
                  <span className="font-semibold text-card-foreground">Requested By:</span>
                  <span className="ml-2 text-muted-foreground">{callSheet.transportRequest.requestedBy}</span>
                </div>
                <div>
                  <span className="font-semibold text-card-foreground">Start:</span>
                  <span className="ml-2 text-muted-foreground">
                    {new Date(callSheet.transportRequest.startDateTime).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-card-foreground">Return:</span>
                  <span className="ml-2 text-muted-foreground">
                    {new Date(callSheet.transportRequest.returnDateTime).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {callSheet.departmentAcknowledgements && callSheet.departmentAcknowledgements.length > 0 && (
          <div className="section">
            <h2 className="text-xl font-semibold text-card-foreground border-b border-border pb-2 mb-4">
              Department Acknowledgements
            </h2>
            {callSheet.departmentAcknowledgements.map((ack) => (
              <div key={ack.department} className="mb-3 pl-4 border-l-2 border-primary">
                <h3 className="font-semibold text-card-foreground">{ack.department}</h3>
                <div className="text-sm text-muted-foreground mt-1">
                  Acknowledged: {ack.acknowledged ? '✓ Yes' : '✗ No'} |
                  Approved: {ack.approved ? '✓ Yes' : '✗ No'}
                </div>
                {ack.comment && (
                  <div className="text-sm text-muted-foreground mt-1 italic">
                    Comment: {ack.comment}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
