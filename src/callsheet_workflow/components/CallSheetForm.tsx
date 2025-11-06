import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AcknowledgementPanel } from './AcknowledgementPanel';
import { EquipmentForm } from './EquipmentForm';
import { TransportForm } from './TransportForm';
import { CallSheetPreview } from './CallSheetPreview';
import type { CallSheetRequest, CrewAssignment, Equipment, DepartmentAcknowledgement, TransportRequest, Notification } from '../types/callsheet';
import { DEPARTMENTS, DEFAULT_NOTIFICATIONS, DEPARTMENT_ACKNOWLEDGEMENTS } from '../types/callsheet';

interface CallSheetFormProps {
  onSubmit: (data: Partial<CallSheetRequest>) => void;
}

type TabType = 'request' | 'equipment' | 'preview';

export const CallSheetForm: React.FC<CallSheetFormProps> = ({ onSubmit }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('request');

  const [formData, setFormData] = useState({
    department: '',
    title: '',
    filmingDate: '',
    callTime: '',
    wrapTime: '',
    location: '',
    focalPoint: '',
    focalPointContact: '',
    driverNeeded: false
  });

  const [crewAssignments, setCrewAssignments] = useState<CrewAssignment[]>([]);
  const [newCrew, setNewCrew] = useState({ role: '', name: '', phone: '' });

  const [departmentAcknowledgements, setDepartmentAcknowledgements] = useState<DepartmentAcknowledgement[]>(
    JSON.parse(JSON.stringify(DEPARTMENT_ACKNOWLEDGEMENTS))
  );

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [departmentsToApprove, setDepartmentsToApprove] = useState<string[]>([]);
  const [departmentsToNotify, setDepartmentsToNotify] = useState<string[]>([]);

  const [transportRequest, setTransportRequest] = useState<TransportRequest>({
    reason: '',
    startDateTime: '',
    returnDateTime: '',
    driverName: '',
    vehicleNo: '',
    requestedBy: 'Current User'
  });

  const [notifications, setNotifications] = useState<Notification[]>(
    JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS))
  );

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddCrew = () => {
    if (!newCrew.role || !newCrew.name) {
      alert('Please fill in role and name');
      return;
    }

    const crew: CrewAssignment = {
      id: Date.now().toString(),
      ...newCrew
    };

    setCrewAssignments([...crewAssignments, crew]);
    setNewCrew({ role: '', name: '', phone: '' });
  };

  const handleRemoveCrew = (id: string) => {
    setCrewAssignments(crewAssignments.filter(c => c.id !== id));
  };

  const handleAcknowledgementChange = (index: number, field: keyof DepartmentAcknowledgement, value: boolean | string) => {
    const updated = [...departmentAcknowledgements];
    updated[index] = { ...updated[index], [field]: value };
    setDepartmentAcknowledgements(updated);
  };

  const handleTransportChange = (field: keyof TransportRequest, value: string) => {
    setTransportRequest(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleNotification = (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, enabled: !n.enabled } : n
    ));
  };

  const handleSubmit = () => {
    if (!formData.department || !formData.title || !formData.filmingDate) {
      alert('Please fill in required fields: Department, Title, and Filming Date');
      return;
    }

    const callSheetData: Partial<CallSheetRequest> = {
      ...formData,
      crewAssignments,
      departmentAcknowledgements,
      equipment,
      departmentsToApprove,
      departmentsToNotify,
      transportRequest,
      notifications,
      status: 'Draft',
      createdBy: 'Current User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSubmit(callSheetData);
  };

  const tabs = [
    { id: 'request' as TabType, label: 'Request & Metadata' },
    { id: 'equipment' as TabType, label: 'Resource Summary' },
    { id: 'preview' as TabType, label: 'Data Preview' }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/callsheet')}
          className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-card-foreground"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">New Call Sheet</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create a new call sheet with equipment and transportation requests
          </p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border mb-6">
        <div className="flex border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-card-foreground hover:bg-muted/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-8">
        {activeTab === 'request' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-card-foreground mb-6">Booking Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Enter title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Filming Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.filmingDate}
                    onChange={(e) => handleChange('filmingDate', e.target.value)}
                    className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Enter location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Call Time
                  </label>
                  <input
                    type="time"
                    value={formData.callTime}
                    onChange={(e) => handleChange('callTime', e.target.value)}
                    className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Wrap Time
                  </label>
                  <input
                    type="time"
                    value={formData.wrapTime}
                    onChange={(e) => handleChange('wrapTime', e.target.value)}
                    className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Focal Point
                  </label>
                  <input
                    type="text"
                    value={formData.focalPoint}
                    onChange={(e) => handleChange('focalPoint', e.target.value)}
                    className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Enter focal point name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Focal Point Contact
                  </label>
                  <input
                    type="text"
                    value={formData.focalPointContact}
                    onChange={(e) => handleChange('focalPointContact', e.target.value)}
                    className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Enter contact number"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.driverNeeded}
                      onChange={(e) => handleChange('driverNeeded', e.target.checked)}
                      className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm text-card-foreground">Driver Needed</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-8">
              <h2 className="text-lg font-semibold text-card-foreground mb-6">Crew Assignments</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input
                  type="text"
                  value={newCrew.role}
                  onChange={(e) => setNewCrew({ ...newCrew, role: e.target.value })}
                  placeholder="Role"
                  className="px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                <input
                  type="text"
                  value={newCrew.name}
                  onChange={(e) => setNewCrew({ ...newCrew, name: e.target.value })}
                  placeholder="Name"
                  className="px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                <input
                  type="text"
                  value={newCrew.phone}
                  onChange={(e) => setNewCrew({ ...newCrew, phone: e.target.value })}
                  placeholder="Phone"
                  className="px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <button
                onClick={handleAddCrew}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors mb-4"
              >
                <Plus size={18} />
                Add Assignment
              </button>

              {crewAssignments.length > 0 && (
                <div className="bg-muted rounded-lg border border-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-card-foreground uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-card-foreground uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-card-foreground uppercase">Phone</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-card-foreground uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {crewAssignments.map((crew) => (
                        <tr key={crew.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-card-foreground">{crew.role}</td>
                          <td className="px-4 py-3 text-sm text-card-foreground">{crew.name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{crew.phone}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <button
                              onClick={() => handleRemoveCrew(crew.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-8">
              <AcknowledgementPanel
                acknowledgements={departmentAcknowledgements}
                onChange={handleAcknowledgementChange}
              />
            </div>
          </div>
        )}

        {activeTab === 'equipment' && (
          <EquipmentForm
            equipment={equipment}
            onAddEquipment={(eq) => setEquipment([...equipment, eq])}
            onRemoveEquipment={(id) => setEquipment(equipment.filter(e => e.id !== id))}
            departmentsToApprove={departmentsToApprove}
            departmentsToNotify={departmentsToNotify}
            onDepartmentsToApproveChange={setDepartmentsToApprove}
            onDepartmentsToNotifyChange={setDepartmentsToNotify}
          />
        )}

        {activeTab === 'preview' && (
          <div className="space-y-8">
            <TransportForm
              transportRequest={transportRequest}
              onChange={handleTransportChange}
              notifications={notifications}
              onToggleNotification={handleToggleNotification}
            />

            <div className="border-t border-border pt-8">
              <CallSheetPreview
                callSheet={{
                  ...formData,
                  crewAssignments,
                  departmentAcknowledgements,
                  equipment,
                  transportRequest,
                  departmentsToApprove,
                  departmentsToNotify
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/callsheet')}
          className="px-6 py-2.5 border border-border text-card-foreground rounded-lg hover:bg-muted transition-colors"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          {activeTab !== 'request' && (
            <button
              onClick={() => {
                const tabs: TabType[] = ['request', 'equipment', 'preview'];
                const currentIndex = tabs.indexOf(activeTab);
                setActiveTab(tabs[currentIndex - 1]);
              }}
              className="px-6 py-2.5 border border-border text-card-foreground rounded-lg hover:bg-muted transition-colors"
            >
              Previous
            </button>
          )}

          {activeTab !== 'preview' ? (
            <button
              onClick={() => {
                const tabs: TabType[] = ['request', 'equipment', 'preview'];
                const currentIndex = tabs.indexOf(activeTab);
                setActiveTab(tabs[currentIndex + 1]);
              }}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Submit Call Sheet
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
