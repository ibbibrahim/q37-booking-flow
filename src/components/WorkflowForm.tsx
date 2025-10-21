import React, { useState } from 'react';
import { FormField } from './FormField';
import { Send, FileJson, Bell, Package, Save } from 'lucide-react';
import type { BookingType, WorkflowRequest, WorkflowStatus } from '../types/workflow';

interface WorkflowFormProps {
  onSubmit: (data: Partial<WorkflowRequest>, status: WorkflowStatus) => void;
  onCancel: () => void;
}

export const WorkflowForm: React.FC<WorkflowFormProps> = ({ onSubmit, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'form' | 'resources' | 'notifications' | 'json'>('form');
  const [formData, setFormData] = useState<Record<string, string>>({
    bookingType: '',
    title: '',
    program: '',
    airDateTime: '',
    language: '',
    priority: '',
    nocRequired: '',
    resourcesNeeded: '',
    newsroomTicket: '',
    complianceTags: '',
    notes: ''
  });

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (status: WorkflowStatus) => {
    onSubmit(formData as any, status);
  };

  const tabs = [
    { id: 'form', label: 'Request & Metadata', icon: Package },
    { id: 'resources', label: 'Resource Summary', icon: Package },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'json', label: 'Data Payload', icon: FileJson }
  ];

  const renderIncomingFeedFields = () => (
    <>
      <FormField
        label="Source Type"
        name="sourceType"
        value={formData.sourceType || ''}
        onChange={handleChange}
        options={['vMix', 'SRT', 'Satellite']}
        required
      />
      <FormField
        label="vMix Input Number"
        name="vmixInputNumber"
        value={formData.vmixInputNumber || ''}
        onChange={handleChange}
      />
      <FormField
        label="Return Path"
        name="returnPath"
        value={formData.returnPath || ''}
        onChange={handleChange}
        options={['Enabled', 'Disabled']}
      />
      <FormField
        label="Key/Fill"
        name="keyFill"
        value={formData.keyFill || ''}
        onChange={handleChange}
        options={['None', 'Key', 'Fill']}
      />
    </>
  );

  const renderGuestRundownFields = () => (
    <>
      <FormField
        label="Guest Name"
        name="guestName"
        value={formData.guestName || ''}
        onChange={handleChange}
        required
      />
      <FormField
        label="Guest Contact"
        name="guestContact"
        value={formData.guestContact || ''}
        onChange={handleChange}
      />
      <FormField
        label="iNEWS Rundown ID"
        name="inewsRundownId"
        value={formData.inewsRundownId || ''}
        onChange={handleChange}
        required
      />
      <FormField
        label="Story Slug"
        name="storySlug"
        value={formData.storySlug || ''}
        onChange={handleChange}
      />
      <FormField
        label="Rundown Position"
        name="rundownPosition"
        value={formData.rundownPosition || ''}
        onChange={handleChange}
      />
    </>
  );

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
        <h2 className="text-2xl font-bold text-white">Create New Workflow Request</h2>
        <p className="text-blue-100 mt-1">Booking → NOC → Ingest</p>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-8">
        {activeTab === 'form' && (
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Booking Type"
                name="bookingType"
                value={formData.bookingType}
                onChange={handleChange}
                options={['Incoming Feed', 'Guest for iNEWS Rundown']}
                required
              />
              <FormField
                label="Priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                options={['Normal', 'High', 'Urgent']}
                required
              />
            </div>

            <FormField
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Program / Segment"
                name="program"
                value={formData.program}
                onChange={handleChange}
                required
              />
              <FormField
                label="Air Date / Time (Local)"
                name="airDateTime"
                type="datetime-local"
                value={formData.airDateTime}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Language"
                name="language"
                value={formData.language}
                onChange={handleChange}
                options={['English', 'Arabic']}
                required
              />
              <FormField
                label="NOC Required"
                name="nocRequired"
                value={formData.nocRequired}
                onChange={handleChange}
                options={['Yes', 'No']}
                required
              />
            </div>

            {formData.bookingType === 'Incoming Feed' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-lg border border-slate-200">
                <div className="col-span-2">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Incoming Feed Details</h3>
                </div>
                {renderIncomingFeedFields()}
              </div>
            )}

            {formData.bookingType === 'Guest for iNEWS Rundown' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-lg border border-slate-200">
                <div className="col-span-2">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Guest & Rundown Details</h3>
                </div>
                {renderGuestRundownFields()}
              </div>
            )}

            <FormField
              label="Resources Needed (Booking)"
              name="resourcesNeeded"
              value={formData.resourcesNeeded}
              onChange={handleChange}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Newsroom Ticket / Ref"
                name="newsroomTicket"
                value={formData.newsroomTicket}
                onChange={handleChange}
              />
              <FormField
                label="Compliance Tags"
                name="complianceTags"
                value={formData.complianceTags}
                onChange={handleChange}
              />
            </div>

            <FormField
              label="Notes"
              name="notes"
              type="textarea"
              value={formData.notes}
              onChange={handleChange}
            />

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => handleSubmit('Submitted')}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Send size={18} />
                Submit Request
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('Draft')}
                className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
              >
                <Save size={18} />
                Save as Draft
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {activeTab === 'resources' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Resource Summary</h3>
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <p className="text-slate-600">Resources will be displayed here once assigned by NOC team.</p>
              {formData.resourcesNeeded && (
                <div className="mt-4">
                  <h4 className="font-medium text-slate-700 mb-2">Requested Resources:</h4>
                  <p className="text-slate-600">{formData.resourcesNeeded}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Notifications</h3>
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <p className="text-slate-600">Notification settings and history will appear here.</p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Booking team will be notified on submission</span>
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>NOC team will be notified when request reaches them</span>
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Ingest team will be notified at final stage</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'json' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Data Payload Preview</h3>
            <pre className="bg-slate-900 text-slate-100 p-6 rounded-lg overflow-x-auto text-sm">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
