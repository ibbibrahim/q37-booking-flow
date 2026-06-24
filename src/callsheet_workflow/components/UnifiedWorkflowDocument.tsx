import React from 'react';
import type { CallSheetRequest } from '../types/callsheet';
import { CALL_SHEET_ROLES } from '../types/callsheet';
import qbcLight from '../../assets/QBC-light.png';
import qbcLightAr from '../../assets/QBC-light-ar.png';
import { formatDateTime } from '@/studio_booking/utils/timeUtils';

interface UnifiedWorkflowDocumentProps {
  callSheet: Partial<CallSheetRequest>;
}

export const UnifiedWorkflowDocument: React.FC<UnifiedWorkflowDocumentProps> = ({ callSheet }) => {
  const mapCategoryToSection = (categoryName: string): string => {
    if (!categoryName) return 'Other';
    const normalized = categoryName.toUpperCase();

    if (normalized.includes('CAMERA') || normalized.includes('LENS') || normalized.includes('TRIPOD') || normalized.includes('DRONE')) {
      return 'Camera';
    }

    if (normalized.includes('LIGHTING') || normalized.includes('LIGHT')) {
      return 'Lighting';
    }

    if (normalized.includes('SOUND') || normalized.includes('AUDIO') || normalized.includes('MICROPHONE') || normalized.includes('MIC')) {
      return 'Sound';
    }

    if (normalized.includes('SD CARD') || normalized.includes('MEMORY CARD') || normalized.includes('STORAGE')) {
      return 'SD Cards';
    }

    return 'Camera';
  };

  const equipmentByCategory = callSheet.equipment
    ? callSheet.equipment.reduce((acc, item) => {
        const section = mapCategoryToSection(item.category || '');
        if (!acc[section]) acc[section] = [];
        acc[section].push(item);
        return acc;
      }, {} as Record<string, typeof callSheet.equipment>)
    : {};

  const displayValue = (value?: string | null) => (value && value.trim() ? value : 'N/A');

  const getAssignmentsForRole = (role: string) => {
    const assignments = callSheet.crewAssignments ?? [];
    if (role === 'Camera Man') {
      return assignments.filter(
        (c) => c.role === 'Camera Man' || c.role === 'Camera 1' || c.role === 'Camera 2' || c.role === 'Camera 3'
      );
    }
    return assignments.filter((c) => c.role === role);
  };

  const locationLabel = callSheet.shootType === 'Indoor' ? 'Indoor Facility' : 'Location';
  const locationValue = displayValue(callSheet.location);

  const productionDetailRows: Array<
    [{ label: string; value: string; highlight?: boolean }, { label: string; value: string; highlight?: boolean }?]
  > = [
    [
      { label: 'Department', value: displayValue(callSheet.department) },
      undefined,
    ],
    [
      { label: 'Title', value: displayValue(callSheet.title), highlight: true },
      { label: 'Event Type', value: displayValue(callSheet.eventType) },
    ],
    [
      { label: 'Start Date & Time', value: formatDateTime(callSheet.startDateTime) || 'N/A' },
      { label: 'Return Date & Time', value: formatDateTime(callSheet.returnDateTime) || 'N/A' },
    ],
    [
      { label: 'Shoot Type', value: displayValue(callSheet.shootType) },
      { label: locationLabel, value: locationValue },
    ],
    [
      { label: 'Focal Point', value: displayValue(callSheet.focalPoint) },
      { label: 'Focal Contact', value: displayValue(callSheet.focalPointContact) },
    ],
    [
      { label: 'Site Filming Permit', value: displayValue(callSheet.sitePermitApproval) },
      callSheet.shootType !== 'Indoor'
        ? { label: 'Driver Needed', value: callSheet.driverNeeded ? '✓ Yes' : '✗ No' }
        : undefined,
    ],
  ];

  const crewRoles = CALL_SHEET_ROLES;

  return (
    <div className="bg-white rounded-lg border border-border print:border-0 p-8 print:p-0 space-y-0 font-sans text-gray-900" style={{ fontSize: '14px' }}>

      {/* ============ UNIFIED HEADER (appears once at top) ============ */}
      <div className="flex justify-between items-start mb-6" style={{ pageBreakAfter: 'avoid' }}>
        <div className="flex-shrink-0 flex items-center gap-2">
          <img src={qbcLight} alt="QBC" style={{ height: '60px', width: 'auto' }} />
          <div style={{ width: '1px', height: '48px', backgroundColor: '#ccc' }} />
          <img src={qbcLightAr} alt="كيو بي سي" style={{ height: '60px', width: 'auto' }} />
        </div>
        <div className="text-center flex-grow">
          <div className="text-lg font-semibold uppercase tracking-wider">QBC Business Channel</div>
          <div className="text-xs text-gray-600 mt-1">SC Classification: GENERAL BUSINESS / Internal Only</div>
        </div>
      </div>

      <div style={{ borderBottom: '2px solid #000', marginBottom: '20px' }}></div>

      {/* ============ SECTION 1: CALL SHEET ============ */}
      <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '15px' }}>CALL SHEET</h2>

        {/* Production Details */}
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>Production Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '60px', rowGap: '10px', marginBottom: '20px' }}>
          {productionDetailRows.map((pair, rowIdx) => {
            const [left, right] = pair;
            if (!right) {
              return (
                <div key={rowIdx} style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', marginBottom: '2px' }}>{left.label}:</span>
                  <div style={{ borderBottom: '1px solid #999', minHeight: '20px', color: '#000', fontWeight: 'bold', backgroundColor: left.highlight ? '#ffff99' : 'transparent', paddingBottom: '2px', fontSize: '13px' }}>{left.value}</div>
                </div>
              );
            }
            return (
              <React.Fragment key={rowIdx}>
                {[left, right].map((field, colIdx) => (
                  <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', marginBottom: '2px' }}>{field.label}:</span>
                    <div style={{ borderBottom: '1px solid #999', minHeight: '20px', color: '#000', fontWeight: 'bold', backgroundColor: field.highlight ? '#ffff99' : 'transparent', paddingBottom: '2px', fontSize: '13px' }}>{field.value}</div>
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>

        <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>Crew Assignments</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
          <thead>
            <tr style={{ backgroundColor: '#2F459E', color: '#fff', textTransform: 'uppercase' }}>
              <th style={{ width: '5%', border: '1px solid #000', padding: '6px', textAlign: 'center' }}>#</th>
              <th style={{ width: '35%', border: '1px solid #000', padding: '6px', textAlign: 'left' }}>Role</th>
              <th style={{ width: '35%', border: '1px solid #000', padding: '6px', textAlign: 'left' }}>Name</th>
              <th style={{ width: '25%', border: '1px solid #000', padding: '6px', textAlign: 'left' }}>Contact</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let rowNumber = 1;
              return crewRoles.flatMap((role) => {
                const currentNumber = rowNumber++;
                const assignments = getAssignmentsForRole(role);
                if (assignments.length === 0) {
                  return [
                    <tr key={`${role}-empty`}>
                      <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'center' }}>{currentNumber}</td>
                      <td style={{ border: '1px solid #000', padding: '5px 6px', fontWeight: 'bold' }}>{role}</td>
                      <td style={{ border: '1px solid #000', padding: '5px 6px' }}></td>
                      <td style={{ border: '1px solid #000', padding: '5px 6px' }}></td>
                    </tr>,
                  ];
                }
                return assignments.map((assignment, i) => (
                  <tr key={`${role}-${i}`}>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'center' }}>{i === 0 ? currentNumber : ''}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', fontWeight: 'bold' }}>{role}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{assignment.name || ''}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{assignment.phone || ''}</td>
                  </tr>
                ));
              });
            })()}
          </tbody>
        </table>
      </div>

      {/* ============ PAGE BREAK DIVIDER ============ */}
      <div style={{ pageBreakBefore: 'always', marginBottom: '20px' }}></div>

      {/* ============ SECTION 2: EQUIPMENT BOOKING REQUEST ============ */}
      <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '15px' }}>EQUIPMENT BOOKING REQUEST FORM</h2>

        {/* Camera Requirement */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ backgroundColor: '#b3d9ff', border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'center' }}>Camera Requirement</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#e8e8e8' }}>
                <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', width: '70%' }}>Description</th>
                <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', width: '30%', textAlign: 'center' }}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {(equipmentByCategory['Camera']?.length || 0) > 0 ? (
                equipmentByCategory['Camera'].map((eq, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center'}}>{eq.item}</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{eq.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#666', fontStyle: 'italic', backgroundColor: '#f9f9f9' }}>No items listed</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Lighting Requirement */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ backgroundColor: '#b3d9ff', border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'center' }}>Lighting Requirement</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#e8e8e8' }}>
                <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', width: '70%' }}>Description</th>
                <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', width: '30%', textAlign: 'center' }}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {(equipmentByCategory['Lighting']?.length || 0) > 0 ? (
                equipmentByCategory['Lighting'].map((eq, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{eq.item}</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{eq.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#666', fontStyle: 'italic', backgroundColor: '#f9f9f9' }}>No items listed</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sound Requirement */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ backgroundColor: '#b3d9ff', border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'center' }}>Sound Requirement</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#e8e8e8' }}>
                <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', width: '70%' }}>Description</th>
                <th style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', width: '30%', textAlign: 'center' }}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {(equipmentByCategory['Sound']?.length || 0) > 0 ? (
                equipmentByCategory['Sound'].map((eq, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{eq.item}</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{eq.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#666', fontStyle: 'italic', backgroundColor: '#f9f9f9' }}>No items listed</td>
                </tr>
              )}
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
              {(equipmentByCategory['SD Cards']?.length || 0) > 0 ? (
                equipmentByCategory['SD Cards'].map((eq, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{eq.item}</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>{eq.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#666', fontStyle: 'italic', backgroundColor: '#f9f9f9' }}>No items listed</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ PAGE BREAK DIVIDER ============ */}
      <div style={{ pageBreakBefore: 'always', marginBottom: '20px' }}></div>

      {/* ============ SECTION 3: VEHICLE REQUISITION FORM ============ */}
      <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '15px' }}>VEHICLE REQUISITION FORM – 37TV</h2>

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
              {/* <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '8px', width: '25%' }}>Requested By</td>
              <td style={{ border: '1px solid #000', padding: '8px', width: '25%' }}>{callSheet.transportRequest?.requestedBy || ''}</td> */}
              <td style={{ fontWeight: 'bold', border: '1px solid #000', padding: '8px', width: '25%' }}>Date</td>
              <td style={{ border: '1px solid #000', padding: '8px', width: '25%' }}>{new Date().toLocaleDateString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ============ FOOTER (at end) ============ */}
      <div style={{ marginTop: '30px', paddingTop: '15px', borderTop: '1px solid #ccc', textAlign: 'center', fontSize: '11px', color: '#666', pageBreakInside: 'avoid' }}>
        Generated by Q37 Workflow Hub – Qatar Media Corporation
      </div>
    </div>
  );
};

export const getPrintStyles = (): string => {
  return `
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
      .section { page-break-inside: avoid; }
      .page-break { page-break-before: always; margin-top: 0; padding-top: 0; }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }
  `;
};
