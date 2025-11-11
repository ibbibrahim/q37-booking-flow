import React, { useRef } from 'react';
import { Download, Printer } from 'lucide-react';

export const CallSheetPrintPreview: React.FC = () => {
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
          <title>Call Sheet</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 12px; 
              color: #000; 
              line-height: 1.4;
              padding: 20px;
            }
            @media print {
              body { padding: 10px; margin: 0; }
              .no-print { display: none; }
            }
            
            .call-sheet {
              max-width: 8.5in;
              width: 100%;
              margin: 0 auto;
              background: white;
              padding: 20px;
            }
            
            .header-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
              font-size: 11px;
            }
            
            .header-section {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            
            .header-label {
              font-weight: bold;
              font-size: 11px;
            }
            
            .header-value {
              padding: 2px 0;
              min-height: 18px;
            }
            
            .call-time-title {
              text-align: center;
              font-size: 24px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin: 10px 0;
            }
            
            .call-time-subtitle {
              text-align: center;
              font-size: 10px;
              color: #666;
              font-style: italic;
              margin-bottom: 15px;
            }
            
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 20px;
            }
            
            .detail-group {
              display: flex;
              flex-direction: column;
              gap: 3px;
              font-size: 11px;
            }
            
            .detail-row {
              display: flex;
              gap: 10px;
            }
            
            .detail-label {
              font-weight: bold;
              min-width: 100px;
            }
            
            .section-title {
              background-color: #333;
              color: white;
              font-weight: bold;
              padding: 6px 8px;
              margin: 15px 0 0 0;
              font-size: 12px;
              text-transform: uppercase;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            
            th, td {
              border: 1px solid #000;
              padding: 6px 8px;
              text-align: left;
              font-size: 11px;
              height: 22px;
            }
            
            th {
              background-color: #333;
              color: white;
              font-weight: bold;
              text-transform: uppercase;
              height: auto;
            }
            
            tr:nth-child(even) td {
              background-color: #f0f0f0;
            }
            
            .table-number {
              width: 30px;
              text-align: center;
            }
            
            .notes-section {
              margin-top: 15px;
            }
            
            .notes-area {
              border: 1px solid #000;
              min-height: 80px;
              padding: 8px;
              font-size: 11px;
            }
            
            .footer {
              text-align: center;
              font-size: 9px;
              color: #999;
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px solid #ccc;
            }
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
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Call Sheet Preview</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Printer size={18} />
            Print
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={18} />
            Save as PDF
          </button>
        </div>
      </div>

      <div
        ref={printRef}
        className="bg-white rounded-lg border border-gray-300 p-8 shadow-lg"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* ============ HEADER SECTION ============ */}
        <div className="grid grid-cols-3 gap-5 mb-6" style={{ fontSize: '11px' }}>
          {/* Left: Production Company */}
          <div className="flex flex-col gap-1">
            <div className="font-bold">Production Company:</div>
            <div className="border-b border-gray-300 min-h-6"></div>
            <div className="mt-3 font-bold">Client:</div>
            <div className="border-b border-gray-300 min-h-6"></div>
            <div className="mt-1 font-bold">Agency:</div>
            <div className="border-b border-gray-300 min-h-6"></div>
            <div className="mt-1 font-bold">Director:</div>
            <div className="border-b border-gray-300 min-h-6"></div>
            <div className="mt-1 font-bold">1st AD:</div>
            <div className="border-b border-gray-300 min-h-6"></div>
            <div className="mt-1 font-bold">PM:</div>
            <div className="border-b border-gray-300 min-h-6"></div>
          </div>

          {/* Center: Call Time */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="text-2xl font-bold tracking-wider">CALL TIME</div>
            <div className="text-xs text-gray-600 italic text-center">
              Please Check Individual Call Times
            </div>
          </div>

          {/* Right: Weather/Location Info */}
          <div className="flex flex-col gap-1">
            <div className="font-bold">Weather:</div>
            <div className="border-b border-gray-300 min-h-6"></div>
            <div className="mt-3 font-bold">Sunrise:</div>
            <div className="border-b border-gray-300 min-h-6"></div>
            <div className="mt-1 font-bold">Sunset:</div>
            <div className="border-b border-gray-300 min-h-6"></div>
            <div className="mt-1 font-bold">Nearest Hospital:</div>
            <div className="border-b border-gray-300 min-h-6"></div>
          </div>
        </div>

        <div className="border-b-2 border-black mb-6"></div>

        {/* ============ CALL AND SHOOT DETAILS SECTION ============ */}
        <div className="grid grid-cols-2 gap-8 mb-6" style={{ fontSize: '11px' }}>
          {/* Left Column */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <span className="font-bold min-w-20">Day of:</span>
              <div className="flex-1 border-b border-gray-300 min-h-6"></div>
            </div>
            <div className="flex gap-2">
              <span className="font-bold min-w-20">Agency Call:</span>
              <div className="flex-1 border-b border-gray-300 min-h-6"></div>
            </div>
            <div className="flex gap-2">
              <span className="font-bold min-w-20">First Shoot:</span>
              <div className="flex-1 border-b border-gray-300 min-h-6"></div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <span className="font-bold min-w-20">Client Call:</span>
              <div className="flex-1 border-b border-gray-300 min-h-6"></div>
            </div>
            <div className="flex gap-2">
              <span className="font-bold min-w-20">Set Parking:</span>
              <div className="flex-1 border-b border-gray-300 min-h-6"></div>
            </div>
            <div className="flex gap-2">
              <span className="font-bold min-w-20">Last Wrap:</span>
              <div className="flex-1 border-b border-gray-300 min-h-6"></div>
            </div>
          </div>
        </div>

        {/* ============ LOCATIONS SECTION ============ */}
        <div className="mb-6">
          <div
            className="bg-black text-white font-bold px-2 py-1 text-sm uppercase"
            style={{ fontSize: '12px' }}
          >
            Locations
          </div>
          <table className="w-full border-collapse border border-black">
            <thead>
              <tr className="bg-gray-300">
                <th className="border border-black px-2 py-1 text-center font-bold" style={{ width: '5%' }}>
                  #
                </th>
                <th className="border border-black px-2 py-1 font-bold">Location</th>
                <th className="border border-black px-2 py-1 font-bold">Address</th>
                <th className="border border-black px-2 py-1 font-bold">Parking & Notes</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(3)].map((_, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                  <td className="border border-black px-2 py-3 text-center" style={{ fontSize: '11px' }}>
                    {i + 1}
                  </td>
                  <td className="border border-black px-2 py-3" style={{ fontSize: '11px', minHeight: '40px' }}></td>
                  <td className="border border-black px-2 py-3" style={{ fontSize: '11px', minHeight: '40px' }}></td>
                  <td className="border border-black px-2 py-3" style={{ fontSize: '11px', minHeight: '40px' }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ============ CREW CONTACTS SECTION ============ */}
        <div className="mb-6">
          <div
            className="bg-black text-white font-bold px-2 py-1 text-sm uppercase"
            style={{ fontSize: '12px' }}
          >
            Crew Contacts
          </div>
          <table className="w-full border-collapse border border-black">
            <thead>
              <tr className="bg-gray-300">
                <th className="border border-black px-2 py-1 font-bold">Role</th>
                <th className="border border-black px-2 py-1 font-bold">Name</th>
                <th className="border border-black px-2 py-1 font-bold">Contact Info</th>
                <th className="border border-black px-2 py-1 font-bold" style={{ width: '20%' }}>
                  Call Time
                </th>
              </tr>
            </thead>
            <tbody>
              {[...Array(6)].map((_, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                  <td className="border border-black px-2 py-3" style={{ fontSize: '11px', minHeight: '40px' }}></td>
                  <td className="border border-black px-2 py-3" style={{ fontSize: '11px', minHeight: '40px' }}></td>
                  <td className="border border-black px-2 py-3" style={{ fontSize: '11px', minHeight: '40px' }}></td>
                  <td className="border border-black px-2 py-3" style={{ fontSize: '11px', minHeight: '40px' }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ============ SCHEDULE & TALENT SECTION ============ */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Schedule */}
          <div>
            <div
              className="bg-black text-white font-bold px-2 py-1 text-sm uppercase"
              style={{ fontSize: '12px' }}
            >
              Schedule
            </div>
            <table className="w-full border-collapse border border-black">
              <thead>
                <tr className="bg-gray-300">
                  <th className="border border-black px-2 py-1 font-bold" style={{ width: '35%' }}>
                    Time
                  </th>
                  <th className="border border-black px-2 py-1 font-bold">Description</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                    <td className="border border-black px-2 py-3" style={{ fontSize: '11px', minHeight: '30px' }}></td>
                    <td className="border border-black px-2 py-3" style={{ fontSize: '11px', minHeight: '30px' }}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Talent */}
          <div>
            <div
              className="bg-black text-white font-bold px-2 py-1 text-sm uppercase"
              style={{ fontSize: '12px' }}
            >
              Talent
            </div>
            <table className="w-full border-collapse border border-black">
              <thead>
                <tr className="bg-gray-300">
                  <th className="border border-black px-2 py-1 font-bold">Name</th>
                  <th className="border border-black px-2 py-1 font-bold" style={{ width: '35%' }}>
                    Call Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...Array(4)].map((_, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                    <td className="border border-black px-2 py-3" style={{ fontSize: '11px', minHeight: '30px' }}></td>
                    <td className="border border-black px-2 py-3" style={{ fontSize: '11px', minHeight: '30px' }}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ============ NOTES SECTION ============ */}
        <div className="mb-4">
          <div
            className="bg-black text-white font-bold px-2 py-1 text-sm uppercase"
            style={{ fontSize: '12px' }}
          >
            Notes
          </div>
          <div
            className="border border-black p-3 bg-white"
            style={{ fontSize: '11px', minHeight: '60px' }}
          ></div>
        </div>

        {/* ============ FOOTER ============ */}
        <div className="text-center text-xs text-gray-500 mt-6 pt-4 border-t border-gray-300">
          Standard Call Sheet Format — Production Schedule & Contact Information
        </div>
      </div>
    </div>
  );
};
