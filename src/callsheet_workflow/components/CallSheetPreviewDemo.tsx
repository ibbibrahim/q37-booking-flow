import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CallSheetPrintPreview } from './CallSheetPrintPreview';

export const CallSheetPreviewDemo: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/callsheet')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            title="Go back to Call Sheets"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Call Sheet Print Preview</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-blue-900 text-sm">
            This is a printable template layout for standard call sheets. It includes all sections needed for production planning: 
            production company info, locations, crew contacts, schedule, talent, and notes. 
            The layout is ready to print or save as PDF without any actual data requirements.
          </p>
        </div>

        <CallSheetPrintPreview />
      </div>
    </div>
  );
};
