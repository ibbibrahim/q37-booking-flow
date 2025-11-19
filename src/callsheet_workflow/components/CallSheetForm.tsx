import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Upload, X, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AcknowledgementPanel } from './AcknowledgementPanel';
import { EquipmentForm } from './EquipmentForm';
import { TransportForm } from './TransportForm';
import { CallSheetPreview } from './CallSheetPreview';
import type { CallSheetRequest, CrewAssignment, Equipment, DepartmentAcknowledgement, TransportRequest, Notification } from '../types/callsheet';
import { DEPARTMENTS, DEFAULT_NOTIFICATIONS, DEPARTMENT_ACKNOWLEDGEMENTS, CALL_SHEET_ROLES  } from '../types/callsheet';

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

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [locationSuggestions] = useState<string[]>([
    'Q37 Studio A, Doha',
    'Q37 Studio B, Doha',
    'Katara Cultural Village, Doha',
    'The Pearl Qatar',
    'Museum of Islamic Art, Doha',
    'Souq Waqif, Doha',
    'Aspire Park, Doha',
    'Education City, Doha',
    'West Bay, Doha',
    'Al Bidda Park, Doha'
  ]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

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
    if (field === 'location') {
      setShowLocationSuggestions(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleLocationSelect = (location: string) => {
    handleChange('location', location);
    setShowLocationSuggestions(false);
  };

  const filteredLocationSuggestions = locationSuggestions.filter(loc =>
    loc.toLowerCase().includes(formData.location.toLowerCase())
  );

  const handleAddCrew = () => {
    if (!newCrew.role || !newCrew.name) {
      alert('Please fill in role and name');
      return;
    }

    const crew: CrewAssignment = {
      // id: Date.now().toString(),
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
            <CardHeader>
              <CardTitle>Booking Information</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department */}
                <div className="space-y-2">
                  <Label htmlFor="department">
                    Department <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => handleChange('department', value)}
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
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

                {/* Filming Date */}
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

                {/* Location with suggestions */}
                <div className="space-y-2 relative">
                  <Label htmlFor="location">
                    <MapPin className="inline-block w-4 h-4 mr-1" />
                    Location
                  </Label>
                  <div className="relative">
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      onFocus={() => setShowLocationSuggestions(true)}
                      placeholder="Enter or select filming location"
                      autoComplete="off"
                    />
                    {showLocationSuggestions && formData.location && filteredLocationSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredLocationSuggestions.map((location, index) => (
                          <button
                            key={index}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm flex items-center gap-2"
                            onClick={() => handleLocationSelect(location)}
                          >
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            {location}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Start typing to see location suggestions</p>
                </div>

                {/* Call Time */}
                <div className="space-y-2">
                  <Label htmlFor="callTime">Call Time</Label>
                  <Input
                    id="callTime"
                    type="time"
                    value={formData.callTime}
                    onChange={(e) => handleChange('callTime', e.target.value)}
                  />
                </div>

                {/* Wrap Time */}
                <div className="space-y-2">
                  <Label htmlFor="wrapTime">Wrap Time</Label>
                  <Input
                    id="wrapTime"
                    type="time"
                    value={formData.wrapTime}
                    onChange={(e) => handleChange('wrapTime', e.target.value)}
                  />
                </div>

                {/* Focal Point */}
                <div className="space-y-2">
                  <Label htmlFor="focalPoint">Focal Point</Label>
                  <Input
                    id="focalPoint"
                    value={formData.focalPoint}
                    onChange={(e) => handleChange('focalPoint', e.target.value)}
                    placeholder="Name"
                  />
                </div>

                {/* Focal Contact */}
                <div className="space-y-2">
                  <Label htmlFor="focalPointContact">Focal Contact</Label>
                  <Input
                    id="focalPointContact"
                    value={formData.focalPointContact}
                    onChange={(e) => handleChange('focalPointContact', e.target.value)}
                    placeholder="Phone number"
                  />
                </div>

                {/* Driver Needed */}
                <div className="md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="driverNeeded"
                      checked={formData.driverNeeded}
                      onCheckedChange={(checked) =>
                        handleChange('driverNeeded', checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="driverNeeded"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Driver Needed
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Attachments</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                />
                <Label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Click to upload files</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOC, XLS, or images (Max 10MB each)
                    </p>
                  </div>
                </Label>
              </div>

              {attachedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Attached Files ({attachedFiles.length})</Label>
                  <div className="space-y-2">
                    {attachedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-background rounded">
                            <Upload className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFile(index)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 flex-shrink-0"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Crew Assignments</CardTitle>
            </CardHeader>

            <CardContent className="pt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Select
                  value={newCrew.role}
                  onValueChange={(value) => setNewCrew({ ...newCrew, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_SHEET_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Card className="border border-border">
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
                          <TableCell className="text-muted-foreground">
                            {crew.phone}
                          </TableCell>
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
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="equipment" className="space-y-6">
          <EquipmentForm
            equipment={equipment}
            onAddEquipment={(eq) => setEquipment([...equipment, eq])}
            onRemoveEquipment={(id) => setEquipment(equipment.filter(e => e.id !== id))}
            departmentsToApprove={departmentsToApprove}
            departmentsToNotify={departmentsToNotify}
            onDepartmentsToApproveChange={setDepartmentsToApprove}
            onDepartmentsToNotifyChange={setDepartmentsToNotify}
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <TransportForm
            transportRequest={transportRequest}
            onChange={handleTransportChange}
            notifications={notifications}
            onToggleNotification={handleToggleNotification}
          />
      
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
