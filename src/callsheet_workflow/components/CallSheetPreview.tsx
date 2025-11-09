import React, { useRef } from 'react';
import { Download, FileText } from 'lucide-react';
import type { CallSheetRequest } from '../types/callsheet';
import qmcLogo from '../../assets/q37.png';

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
          <title>QMC Workflow - ${callSheet.title || 'Form'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 14px; 
              color: #000; 
              line-height: 1.3;
              padding: 20px;
            }
            @media print {
              body { padding: 0; margin: 0; }
              .print-container { page-break-inside: avoid; }
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
              gap: 20px;
            }
            .logo { height: 60px; width: auto; }
            .header-text { flex: 1; text-align: right; }
            .form-title { 
              font-size: 18px; 
              font-weight: bold; 
              text-transform: uppercase; 
              letter-spacing: 1px;
              margin-bottom: 4px;
            }
            .form-subtitle { 
              font-size: 11px; 
              color: #666; 
              font-weight: normal;
            }
            .divider { border-bottom: 2px solid #000; margin: 15px 0; }
            
            .section { margin-bottom: 20px; page-break-inside: avoid; }
            .section-title { 
              font-size: 13px; 
              font-weight: bold; 
              text-transform: uppercase;
              background-color: #e8e8e8;
              border-bottom: 1px solid #000;
              padding: 6px 4px;
              margin-bottom: 0;
            }
            
            table { 
              width: 100%; 
              border-collapse: collapse; 
              border: 1px solid #000;
            }
            th, td { 
              border: 1px solid #000; 
              padding: 6px 8px; 
              text-align: left; 
              font-size: 13px;
            }
            th { 
              background-color: #e8e8e8; 
              font-weight: bold; 
              text-transform: uppercase;
            }
            td.label { font-weight: bold; background-color: #f5f5f5; width: 140px; }
            td.value { background-color: #fff; }
            
            .highlighted { background-color: #ffff99; }
            
            .info-row { display: grid; grid-template-columns: 200px 1fr; margin-bottom: 0; }
            .info-cell { border: 1px solid #000; padding: 6px 8px; }
            .info-label { font-weight: bold; background-color: #f5f5f5; }
            .info-value { background-color: #fff; }
            
            .grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
            .grid-item { border: 1px solid #000; padding: 6px 8px; }
            
            .checkbox-group { display: flex; gap: 15px; }
            .checkbox-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
            .checkbox { width: 14px; height: 14px; border: 1px solid #000; }
            
            .signature-line { 
              border-bottom: 1px solid #000; 
              height: 30px; 
              margin: 10px 0;
            }
            
            .footer {
              text-align: center;
              font-size: 10px;
              color: #666;
              margin-top: 30px;
              padding-top: 10px;
              border-top: 1px solid #ccc;
            }
            
            .crew-checkbox { width: 30px; text-align: center; }
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

  const hasEquipment = callSheet.equipment && callSheet.equipment.length > 0;
  const hasTransport = callSheet.transportRequest;
  const hasCrew = callSheet.crewAssignments && callSheet.crewAssignments.length > 0;

  // Determine form type based on data
  let formType: 'call-sheet' | 'equipment' | 'transport' = 'call-sheet';
  let formTitle = 'CALL SHEET';
  
  if (hasEquipment && !hasCrew) {
    formType = 'equipment';
    formTitle = 'EQUIPMENT BOOKING REQUEST FORM';
  } else if (hasTransport && !hasCrew) {
    formType = 'transport';
    formTitle = 'VEHICLE REQUISITION FORM – 37TV';
  }

  // Group equipment by category
  const equipmentByCategory = callSheet.equipment
    ? callSheet.equipment.reduce((acc, item) => {
        const cat = item.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {} as Record<string, typeof callSheet.equipment>)
    : {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
          <FileText size={20} />
          {formTitle}
        </h3>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Download size={18} />
          Print / Save PDF
        </button>
      </div>

      <div ref={printRef} className="bg-white rounded-lg border border-border print:border-0 p-8 print:p-0 space-y-0 font-sans text-gray-900" style={{ fontSize: '14px' }}>
        
        {/* Header with Logo and Title */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-shrink-0">
            <img src={qmcLogo} alt="QMC Logo" style={{ height: '60px', width: 'auto' }} />
          </div>
          <div className="text-center flex-grow">
            <div className="text-lg font-semibold uppercase tracking-wider">{formTitle}</div>
            <div className="text-xs text-gray-600 mt-1">SC Classification: GENERAL BUSINESS / Internal Only</div>
          </div>
        </div>

        <div style={{ borderBottom: '2px solid #000', marginBottom: '20px' }}></div>

        {/* CALL SHEET FORM */}
        {formType === 'call-sheet' && (
          <>
            {/* Location Type Tabs */}
            <div className="flex gap-8 mb-6">
              <div className="font-semibold text-sm">Studio</div>
              <div className="font-semibold text-sm">Outdoor</div>
            </div>

            {/* Booking Information Table */}
            <table style={{ marginBottom: '20px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0', width: '140px', border: '1px solid #000', padding: '6px 8px' }}>Department</td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{callSheet.department || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0', border: '1px solid #000', padding: '6px 8px' }}>Title</td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px', backgroundColor: '#ffff99' }}>{callSheet.title || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0', border: '1px solid #000', padding: '6px 8px' }}>Filming Date</td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{callSheet.filmingDate || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0', border: '1px solid #000', padding: '6px 8px' }}>Call time</td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{callSheet.callTime || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0', border: '1px solid #000', padding: '6px 8px' }}>Wrap time</td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{callSheet.wrapTime || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0', border: '1px solid #000', padding: '6px 8px' }}>Locations</td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{callSheet.location || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0', border: '1px solid #000', padding: '6px 8px' }}>Focal Point</td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{callSheet.focalPoint || 'N/A'}</td>
                </tr>
              </tbody>
            </table>

            {/* Crew Assignments Table */}
            {hasCrew && (
              <table style={{ marginBottom: '20px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                    <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'left' }}>Role</th>
                    <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'left' }}>Name</th>
                    <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'left' }}>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }}>Director</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }}>Producer</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                      {callSheet.crewAssignments?.find(c => c.role === 'Producer')?.name || ''}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                      {callSheet.crewAssignments?.find(c => c.role === 'Producer')?.phone || ''}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }}>Presenter</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }}>Assistant Director (If Available)</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }}>Camera 1</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                      {callSheet.crewAssignments?.find(c => c.role === 'Camera 1')?.name || ''}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                      {callSheet.crewAssignments?.find(c => c.role === 'Camera 1')?.phone || ''}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }}>Camera 2</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }}>Camera 3</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }}>Camera Assistant (If Needed)</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }}>Sound Technician</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                      {callSheet.crewAssignments?.find(c => c.role === 'Sound Technician')?.name || ''}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                      {callSheet.crewAssignments?.find(c => c.role === 'Sound Technician')?.phone || ''}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }}>Studio Operator</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }}>Driver Needed</td>
                    <td colSpan={2} style={{ border: '1px solid #000', padding: '6px 8px' }}>
                      {callSheet.driverNeeded ? '✓ Yes' : '✗ No'}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </>
        )}

        {/* EQUIPMENT REQUEST FORM */}
        {formType === 'equipment' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', marginBottom: '20px' }}>
              {/* Camera Requirement */}
              <div style={{ borderRight: '1px solid #000' }}>
                <div style={{ backgroundColor: '#b3d9ff', border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'center' }}>Camera Requirement</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#e8e8e8' }}>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', width: '70%' }}>Description</th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', width: '30%', textAlign: 'center' }}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(equipmentByCategory['Camera'] || []).map((eq, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{eq.item}</td>
                        <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{eq.quantity}</td>
                      </tr>
                    ))}
                    {[...Array(5 - (equipmentByCategory['Camera']?.length || 0))].map((_, idx) => (
                      <tr key={`empty-camera-${idx}`}>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Lighting Requirement */}
              <div>
                <div style={{ backgroundColor: '#b3d9ff', border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'center' }}>Lighting Requirement</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#e8e8e8' }}>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', width: '70%' }}>Description</th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', width: '30%', textAlign: 'center' }}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(equipmentByCategory['Lighting'] || []).map((eq, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{eq.item}</td>
                        <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{eq.quantity}</td>
                      </tr>
                    ))}
                    {[...Array(5 - (equipmentByCategory['Lighting']?.length || 0))].map((_, idx) => (
                      <tr key={`empty-light-${idx}`}>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', marginBottom: '20px' }}>
              {/* Sound Requirement */}
              <div style={{ borderRight: '1px solid #000' }}>
                <div style={{ backgroundColor: '#b3d9ff', border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'center' }}>Sound Requirement</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#e8e8e8' }}>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', width: '70%' }}>Description</th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', width: '30%', textAlign: 'center' }}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(equipmentByCategory['Sound'] || []).map((eq, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{eq.item}</td>
                        <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{eq.quantity}</td>
                      </tr>
                    ))}
                    {[...Array(5 - (equipmentByCategory['Sound']?.length || 0))].map((_, idx) => (
                      <tr key={`empty-sound-${idx}`}>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SD Cards */}
              <div>
                <div style={{ backgroundColor: '#b3d9ff', border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'center' }}>SD Cards</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#e8e8e8' }}>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', width: '70%' }}>Description</th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', width: '30%', textAlign: 'center' }}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(equipmentByCategory['SD Cards'] || []).map((eq, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{eq.item}</td>
                        <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{eq.quantity}</td>
                      </tr>
                    ))}
                    {[...Array(5 - (equipmentByCategory['SD Cards']?.length || 0))].map((_, idx) => (
                      <tr key={`empty-sd-${idx}`}>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approval Section */}
            <div style={{ marginTop: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0', border: '1px solid #000', padding: '6px 8px', width: '140px' }}>Store Keeper</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0', border: '1px solid #000', padding: '6px 8px' }}>Dept Manager Approval</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* VEHICLE REQUISITION FORM */}
        {formType === 'transport' && (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '8px', width: '140px' }}>Driver Name :</td>
                  <td style={{ border: '1px solid #000', padding: '8px', fontSize: '12px', color: '#999' }}>
                    {callSheet.transportRequest?.driverName || '(to be filled out by the concerned team)'}
                  </td>
                </tr>
              </tbody>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '8px', width: '140px', verticalAlign: 'top' }}>Reason :</td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input type="checkbox" checked={callSheet.transportRequest?.reason === 'Filming'} readOnly style={{ width: '16px', height: '16px' }} />
                        Filming
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input type="checkbox" checked={callSheet.transportRequest?.reason === 'Recce'} readOnly style={{ width: '16px', height: '16px' }} />
                        Recce
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input type="checkbox" checked={callSheet.transportRequest?.reason === 'Meeting'} readOnly style={{ width: '16px', height: '16px' }} />
                        Meeting
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input type="checkbox" checked={callSheet.transportRequest?.reason === 'Other'} readOnly style={{ width: '16px', height: '16px' }} />
                        Other
                      </label>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '8px', width: '140px' }}>Vehicle No :</td>
                  <td style={{ border: '1px solid #000', padding: '8px', fontSize: '12px', color: '#999' }}>
                    {callSheet.transportRequest?.vehicleNo || '(to be filled out by the concerned team)'}
                  </td>
                </tr>
              </tbody>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0', border: '1px solid #000', padding: '8px', width: '50%', textAlign: 'center' }}>Start Time & Date</td>
                  <td style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0', border: '1px solid #000', padding: '8px', width: '50%', textAlign: 'center' }}>Return Time & Date</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '12px 8px', minHeight: '40px' }}>
                    {callSheet.transportRequest?.startDateTime 
                      ? new Date(callSheet.transportRequest.startDateTime).toLocaleString('en-US', { 
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true 
                        })
                      : ''}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '12px 8px', minHeight: '40px' }}>
                    {callSheet.transportRequest?.returnDateTime 
                      ? new Date(callSheet.transportRequest.returnDateTime).toLocaleString('en-US', { 
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true 
                        })
                      : ''}
                  </td>
                </tr>
              </tbody>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '8px', width: '25%' }}>Requested By</td>
                  <td style={{ border: '1px solid #000', padding: '8px', width: '25%' }}>{callSheet.transportRequest?.requestedBy || ''}</td>
                  <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '8px', width: '25%' }}>Date</td>
                  <td style={{ border: '1px solid #000', padding: '8px', width: '25%' }}>{new Date().toLocaleDateString()}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: '30px', paddingTop: '15px', borderTop: '1px solid #ccc', textAlign: 'center', fontSize: '11px', color: '#666' }}>
          Generated by Q37 Workflow Hub – Qatar Media Corporation
        </div>
      </div>
    </div>
  );
};
