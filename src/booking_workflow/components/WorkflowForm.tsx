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

  const renderDownloadAndIngestFields = () => (
    <>
      <FormField
        label="Download Source"
        name="downloadSource"
        value={formData.downloadSource || ""}
        onChange={handleChange}
        options={["YouTube", "WeTransfer", "FTP", "Other"]}
        required
      />
      <FormField
        label="Download Link / URL"
        name="downloadLink"
        value={formData.downloadLink || ""}
        onChange={handleChange}
        required
      />
    </>
  );

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="min-h-screen">
        <div className="bg-card border-b border-border px-6 py-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-card-foreground">New Workflow Request</h1>
            <p className="text-muted-foreground text-sm mt-1">Create a new booking request for NOC and Ingest teams</p>
          </div>
        </div>

        <div className="bg-muted border-b border-border">
          <div className="max-w-6xl mx-auto flex">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-card text-card-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-card-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto py-6 px-6">
          {activeTab === 'form' && (
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-card-foreground mb-6">Booking Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    label="Booking Type"
                    name="bookingType"
                    value={formData.bookingType}
                    onChange={handleChange}
                    options={['Incoming Feed', 'Invite Guest for News', 'Invite Guest for Program', 'Download and Ingest']}
                    required
                  />
                  <FormField
                    label="Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <FormField
                    label="Program / Segment"
                    name="program"
                    value={formData.program}
                    onChange={handleChange}
                    placeholder="e.g., Evening News"
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

                {formData.bookingType === 'Incoming Feed' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <FormField
                      label="Feed Start Time"
                      name="feedStartTime"
                      type="datetime-local"
                      value={formData.feedStartTime || ''}
                      onChange={handleChange}
                      required
                    />
                    <FormField
                      label="Feed End Time"
                      name="feedEndTime"
                      type="datetime-local"
                      value={formData.feedEndTime || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <FormField
                    label="Language"
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    options={['English', 'Arabic']}
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
              </div>

              {(formData.bookingType === 'Invite Guest for News' || formData.bookingType === 'Invite Guest for Program') && (
                <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-card-foreground mb-6">Guest & Rundown Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderGuestRundownFields()}
                  </div>
                </div>
              )}

              {formData.bookingType === 'Download and Ingest' && (
                <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-card-foreground mb-6">Download Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderDownloadAndIngestFields()}
                  </div>
                </div>
              )}

              <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-card-foreground mb-6">Additional Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    label="NOC Required"
                    name="nocRequired"
                    value={formData.nocRequired}
                    onChange={handleChange}
                    options={['Yes', 'No']}
                    required
                  />
                  <FormField
                    label="Newsroom Ticket / Ref"
                    name="newsroomTicket"
                    value={formData.newsroomTicket}
                    onChange={handleChange}
                  />
                </div>

                <div className="mt-6">
                  <FormField
                    label="Resources Needed (Booking)"
                    name="resourcesNeeded"
                    value={formData.resourcesNeeded}
                    onChange={handleChange}
                  />
                </div>

                <div className="mt-6">
                  <FormField
                    label="Compliance Tags"
                    name="complianceTags"
                    value={formData.complianceTags}
                    onChange={handleChange}
                  />
                </div>

                <div className="mt-6">
                  <FormField
                    label="Notes"
                    name="notes"
                    type="textarea"
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2.5 text-card-foreground rounded-lg hover:bg-muted transition-colors font-medium border border-border"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit('Submitted')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  <Send size={18} />
                  Submit Request
                </button>
              </div>
            </form>
          )}

          {activeTab === 'resources' && (
            <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Resource Summary</h3>
              <p className="text-muted-foreground">Resources will be displayed here once assigned by NOC team.</p>
              {formData.resourcesNeeded && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium text-card-foreground mb-2">Requested Resources:</h4>
                  <p className="text-muted-foreground">{formData.resourcesNeeded}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Notifications</h3>
              <p className="text-muted-foreground mb-4">Notification settings and history will appear here.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Booking team will be notified on submission</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>NOC team will be notified when request reaches them</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Ingest team will be notified at final stage</span>
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Data Payload Preview</h3>
              <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-6 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(formData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
