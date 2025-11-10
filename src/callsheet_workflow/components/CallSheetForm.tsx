import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AcknowledgementPanel } from './AcknowledgementPanel';
import { EquipmentForm } from './EquipmentForm';
import { TransportForm } from './TransportForm';
import { CallSheetPreview } from './CallSheetPreview';
import type { CallSheetRequest, CrewAssignment, Equipment, DepartmentAcknowledgement, TransportRequest, Notification } from '../types/callsheet';
import { DEPARTMENTS, DEFAULT_NOTIFICATIONS, DEPARTMENT_ACKNOWLEDGEMENTS } from '../types/callsheet';

interface CallSheetFormProps {
  onSubmit: (data: Partial<CallSheetRequest>) => void;
}

export const CallSheetForm: React.FC<CallSheetFormProps> = ({ onSubmit }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('request');

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
    requestedBy: 1 // TODO: replace with actual user context
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
      createdBy: 1, // TODO: replace with actual user context
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSubmit(callSheetData);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/callsheet')}
          className="rounded-lg"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">New Call Sheet</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create a new call sheet with equipment and transportation requests
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-6 flex flex-wrap gap-2 sm:gap-4 sm:grid sm:grid-cols-3">
          <TabsTrigger value="request">Call Sheet</TabsTrigger>
          <TabsTrigger value="equipment">Equipment Request</TabsTrigger>
          <TabsTrigger value="preview">Transportation</TabsTrigger>
        </TabsList>

        <TabsContent value="request" className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground mb-6">Booking Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="department">
                      Department <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.department} onValueChange={(value) => handleChange('department', value)}>
                      <SelectTrigger id="department">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="Enter call sheet title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filmingDate">
                      Filming Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="filmingDate"
                      type="date"
                      value={formData.filmingDate}
                      onChange={(e) => handleChange('filmingDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="Filming location"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="callTime">Call Time</Label>
                    <Input
                      id="callTime"
                      type="time"
                      value={formData.callTime}
                      onChange={(e) => handleChange('callTime', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wrapTime">Wrap Time</Label>
                    <Input
                      id="wrapTime"
                      type="time"
                      value={formData.wrapTime}
                      onChange={(e) => handleChange('wrapTime', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="focalPoint">Focal Point</Label>
                    <Input
                      id="focalPoint"
                      value={formData.focalPoint}
                      onChange={(e) => handleChange('focalPoint', e.target.value)}
                      placeholder="Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="focalPointContact">Focal Contact</Label>
                    <Input
                      id="focalPointContact"
                      value={formData.focalPointContact}
                      onChange={(e) => handleChange('focalPointContact', e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="driverNeeded"
                        checked={formData.driverNeeded}
                        onCheckedChange={(checked) => handleChange('driverNeeded', checked as boolean)}
                      />
                      <Label htmlFor="driverNeeded" className="text-sm font-normal cursor-pointer">
                        Driver Needed
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-8">
                <h2 className="text-lg font-semibold text-card-foreground mb-6">Crew Assignments</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Input
                    value={newCrew.role}
                    onChange={(e) => setNewCrew({ ...newCrew, role: e.target.value })}
                    placeholder="Role"
                  />
                  <Input
                    value={newCrew.name}
                    onChange={(e) => setNewCrew({ ...newCrew, name: e.target.value })}
                    placeholder="Name"
                  />
                  <Input
                    value={newCrew.phone}
                    onChange={(e) => setNewCrew({ ...newCrew, phone: e.target.value })}
                    placeholder="Phone"
                  />
                </div>

                <Button onClick={handleAddCrew} className="mb-4">
                  <Plus size={18} className="mr-2" />
                  Add Assignment
                </Button>

                {crewAssignments.length > 0 && (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {crewAssignments.map((crew) => (
                          <TableRow key={crew.id}>
                            <TableCell>{crew.role}</TableCell>
                            <TableCell>{crew.name}</TableCell>
                            <TableCell className="text-muted-foreground">{crew.phone}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveCrew(crew.id)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </div>

              {/* <div className="border-t pt-8">
                <AcknowledgementPanel
                  acknowledgements={departmentAcknowledgements}
                  onChange={handleAcknowledgementChange}
                />
              </div> */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment">
          <Card>
            <CardContent className="pt-6">
              <EquipmentForm
                equipment={equipment}
                onAddEquipment={(eq) => setEquipment([...equipment, eq])}
                onRemoveEquipment={(id) => setEquipment(equipment.filter(e => e.id !== id))}
                departmentsToApprove={departmentsToApprove}
                departmentsToNotify={departmentsToNotify}
                onDepartmentsToApproveChange={setDepartmentsToApprove}
                onDepartmentsToNotifyChange={setDepartmentsToNotify}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <TransportForm
                transportRequest={transportRequest}
                onChange={handleTransportChange}
                notifications={notifications}
                onToggleNotification={handleToggleNotification}
              />
            </CardContent>
          </Card>

          <div className="pt-4">
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
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/callsheet')}>
          Cancel
        </Button>

        <div className="flex items-center gap-3">
          {activeTab !== 'request' && (
            <Button
              variant="outline"
              onClick={() => {
                const tabs = ['request', 'equipment', 'preview'];
                const currentIndex = tabs.indexOf(activeTab);
                setActiveTab(tabs[currentIndex - 1]);
              }}
            >
              Previous
            </Button>
          )}

          {activeTab !== 'preview' ? (
            <Button
              onClick={() => {
                const tabs = ['request', 'equipment', 'preview'];
                const currentIndex = tabs.indexOf(activeTab);
                setActiveTab(tabs[currentIndex + 1]);
              }}
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              Submit Call Sheet
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
