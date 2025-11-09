import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Clock, User, FileText } from 'lucide-react';
import { mockCallSheetApi } from '../services/mockCallSheetApi';
import type { CallSheetRequest } from '../types/callsheet';

export const CallSheetDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [callSheet, setCallSheet] = useState<CallSheetRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadCallSheet = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await mockCallSheetApi.getCallSheetById(id);
        if (data) {
          setCallSheet(data);
        }
      } catch (error) {
        console.error('Failed to load call sheet:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCallSheet();
  }, [id]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Call Sheet - ${callSheet?.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            h2 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; }
            h3 { font-size: 16px; margin-top: 15px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .info-row { display: flex; margin-bottom: 8px; }
            .info-label { font-weight: bold; width: 150px; }
            .section { margin-bottom: 20px; page-break-inside: avoid; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!callSheet) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Call sheet not found</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    'Draft': 'bg-slate-100 text-slate-700',
    'Pending Approval': 'bg-yellow-100 text-yellow-700',
    'Approved': 'bg-green-100 text-green-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    'Completed': 'bg-purple-100 text-purple-700',
    'Cancelled': 'bg-red-100 text-red-700'
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-card border-b border-border px-6 py-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/callsheet')}
            className="text-muted-foreground hover:text-card-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-card-foreground">{callSheet.title}</h1>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[callSheet.status]}`}>
                {callSheet.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span>{callSheet.id}</span>
              <span>•</span>
              <span>{callSheet.department}</span>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Download size={18} />
            Download PDF
          </button>
        </div>
      </div>

      <div ref={printRef} className="px-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <FileText size={20} />
                Call Sheet Details
              </h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Department</div>
                  <div className="text-card-foreground font-medium">{callSheet.department}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Filming Date</div>
                  <div className="text-card-foreground font-medium">
                    {new Date(callSheet.filmingDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Location</div>
                  <div className="text-card-foreground font-medium">{callSheet.location || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Focal Point</div>
                  <div className="text-card-foreground font-medium">{callSheet.focalPoint || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Call Time</div>
                  <div className="text-card-foreground font-medium">{callSheet.callTime || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Wrap Time</div>
                  <div className="text-card-foreground font-medium">{callSheet.wrapTime || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Contact</div>
                  <div className="text-card-foreground font-medium">{callSheet.focalPointContact || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Driver Needed</div>
                  <div className="text-card-foreground font-medium">{callSheet.driverNeeded ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>

            {callSheet.crewAssignments.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold text-card-foreground mb-4">Crew Assignments</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-2 text-left text-card-foreground">Role</th>
                        <th className="px-4 py-2 text-left text-card-foreground">Name</th>
                        <th className="px-4 py-2 text-left text-card-foreground">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {callSheet.crewAssignments.map((crew) => (
                        <tr key={crew.id} className="border-b border-border">
                          <td className="px-4 py-2 text-card-foreground">{crew.role}</td>
                          <td className="px-4 py-2 text-card-foreground">{crew.name}</td>
                          <td className="px-4 py-2 text-muted-foreground">{crew.phone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {callSheet.equipment.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold text-card-foreground mb-4">Equipment List</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-2 text-left text-card-foreground">Category</th>
                        <th className="px-4 py-2 text-left text-card-foreground">Item</th>
                        <th className="px-4 py-2 text-left text-card-foreground">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {callSheet.equipment.map((eq) => (
                        <tr key={eq.id} className="border-b border-border">
                          <td className="px-4 py-2 text-card-foreground">{eq.category}</td>
                          <td className="px-4 py-2 text-card-foreground">{eq.item}</td>
                          <td className="px-4 py-2 text-muted-foreground">{eq.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {callSheet.transportRequest && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold text-card-foreground mb-4">Transportation</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Reason</div>
                    <div className="text-card-foreground font-medium">{callSheet.transportRequest.reason}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Driver</div>
                    <div className="text-card-foreground font-medium">{callSheet.transportRequest.driverName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Vehicle No</div>
                    <div className="text-card-foreground font-medium">{callSheet.transportRequest.vehicleNo}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Requested By</div>
                    <div className="text-card-foreground font-medium">{callSheet.transportRequest.requestedBy}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Start Time</div>
                    <div className="text-card-foreground font-medium">
                      {new Date(callSheet.transportRequest.startDateTime).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Return Time</div>
                    <div className="text-card-foreground font-medium">
                      {new Date(callSheet.transportRequest.returnDateTime).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {callSheet.departmentAcknowledgements.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold text-card-foreground mb-4">Department Acknowledgements</h2>
                <div className="space-y-3">
                  {callSheet.departmentAcknowledgements.map((ack) => (
                    <div key={ack.department} className="p-3 bg-muted rounded-lg">
                      <h3 className="font-semibold text-card-foreground mb-1">{ack.department}</h3>
                      <div className="text-sm text-muted-foreground">
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
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">Metadata</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <User size={14} />
                    <span>Created by</span>
                  </div>
                  <div className="text-sm font-medium text-card-foreground">{callSheet.createdBy}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Clock size={14} />
                    <span>Created at</span>
                  </div>
                  <div className="text-sm text-card-foreground">
                    {new Date(callSheet.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Clock size={14} />
                    <span>Last updated</span>
                  </div>
                  <div className="text-sm text-card-foreground">
                    {new Date(callSheet.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
