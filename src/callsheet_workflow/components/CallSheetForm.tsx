import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Upload, X, MapPin, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AcknowledgementPanel } from './AcknowledgementPanel';
import { EquipmentForm } from './EquipmentForm';
import { TransportForm } from './TransportForm';
import { CallSheetPreview } from './CallSheetPreview';
import type { CallSheetRequest, CrewAssignment, Equipment, DepartmentAcknowledgement, TransportRequest, Notification } from '../types/callsheet';
import { DEPARTMENTS, DEFAULT_NOTIFICATIONS, DEPARTMENT_ACKNOWLEDGEMENTS, CALL_SHEET_ROLES  } from '../types/callsheet';
import { utcToQatarTime, qatarTimeToUTC, getCurrentQatarDateTime } from '../utils/timezone';

interface CallSheetFormProps {
  onSubmit: (data: Partial<CallSheetRequest>) => void;
  initialCallSheet?: CallSheetRequest;
  mode?: 'create' | 'technicalStore';
}

export const CallSheetForm: React.FC<CallSheetFormProps> = ({ onSubmit, initialCallSheet, mode = 'create' }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('request');
  const isTechnicalStoreMode = mode === 'technicalStore';

  const [formData, setFormData] = useState({
    department: '',
    title: '',
    startDateTime: '',
    returnDateTime: '',
    callTime: '',
    wrapTime: '',
    location: '',
    focalPoint: '',
    focalPointContact: '',
    driverNeeded: false
  });

  const [startDateError, setStartDateError] = useState<string>('');
  const [returnDateError, setReturnDateError] = useState<string>('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

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

  // Initialize form with existing data if provided
  useEffect(() => {
    if (initialCallSheet) {
      const startQatar = initialCallSheet.startDateTime ? utcToQatarTime(initialCallSheet.startDateTime) : '';
      const returnQatar = initialCallSheet.returnDateTime ? utcToQatarTime(initialCallSheet.returnDateTime) : '';

      setFormData({
        department: initialCallSheet.department || '',
        title: initialCallSheet.title || '',
        startDateTime: startQatar,
        returnDateTime: returnQatar,
        callTime: initialCallSheet.callTime || '',
        wrapTime: initialCallSheet.wrapTime || '',
        location: initialCallSheet.location || '',
        focalPoint: initialCallSheet.focalPoint || '',
        focalPointContact: initialCallSheet.focalPointContact || '',
        driverNeeded: initialCallSheet.driverNeeded || false
      });

      if (initialCallSheet.crewAssignments) {
        setCrewAssignments(initialCallSheet.crewAssignments);
      }

      if (initialCallSheet.departmentAcknowledgements) {
        setDepartmentAcknowledgements(initialCallSheet.departmentAcknowledgements);
      }

      if (initialCallSheet.equipment) {
        setEquipment(initialCallSheet.equipment);
      }

      if (initialCallSheet.transportRequest) {
        setTransportRequest({
          reason: initialCallSheet.transportRequest.reason || '',
          startDateTime: utcToQatarTime(initialCallSheet.transportRequest.startDateTime || ''),
          returnDateTime: utcToQatarTime(initialCallSheet.transportRequest.returnDateTime || ''),
          driverName: initialCallSheet.transportRequest.driverName || '',
          driverNo: initialCallSheet.transportRequest.driverNo || '',
          carType: initialCallSheet.transportRequest.carType || '',
          requestedBy: initialCallSheet.transportRequest.requestedBy || 1
        });
      }

      if (initialCallSheet.departmentsToApprove) {
        setDepartmentsToApprove(initialCallSheet.departmentsToApprove);
      }

      if (initialCallSheet.departmentsToNotify) {
        setDepartmentsToNotify(initialCallSheet.departmentsToNotify);
      }

      if (initialCallSheet.notifications) {
        setNotifications(initialCallSheet.notifications);
      }
    }
  }, [initialCallSheet]);

  const validateStartDate = (value: string) => {
    if (!value) {
      setStartDateError('');
      return true;
    }

    const qatarDate = new Date(value);
    const nowQatar = new Date(getCurrentQatarDateTime());

    if (qatarDate < nowQatar) {
      setStartDateError('Cannot select a past date and time');
      return false;
    }

    setStartDateError('');
    return true;
  };

  const validateReturnDate = (returnValue: string, startValue: string) => {
    if (!returnValue) {
      setReturnDateError('');
      return true;
    }

    const returnDate = new Date(returnValue);
    const nowQatar = new Date(getCurrentQatarDateTime());

    if (returnDate < nowQatar) {
      setReturnDateError('Cannot select a past date and time');
      return false;
    }

    if (startValue) {
      const startDate = new Date(startValue);
      if (returnDate <= startDate) {
        setReturnDateError('Return date must be after start date');
        return false;
      }
    }

    setReturnDateError('');
    return true;
  };

  const handleStartDateChange = (value: string) => {
    const isValid = validateStartDate(value);

    if (isValid || !value) {
      setFormData(prev => ({ ...prev, startDateTime: value }));
      setTransportRequest(prev => ({ ...prev, startDateTime: value }));

      if (formData.returnDateTime) {
        validateReturnDate(formData.returnDateTime, value);
      }
    }
  };

  const handleReturnDateChange = (value: string) => {
    const isValid = validateReturnDate(value, formData.startDateTime);

    if (isValid || !value) {
      setFormData(prev => ({ ...prev, returnDateTime: value }));
      setTransportRequest(prev => ({ ...prev, returnDateTime: value }));
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'location') {
      setShowLocationSuggestions(false);
    }
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!formData.department || !formData.title || !formData.startDateTime || !formData.returnDateTime) {
      alert('Please fill in required fields: Department, Title, Start Date & Time, and Return Date & Time');
      return;
    }

    if (startDateError || returnDateError) {
      alert('Please fix validation errors before submitting');
      return;
    }

    const callSheetData: Partial<CallSheetRequest> = {
      department: formData.department,
      title: formData.title,
      startDateTime: qatarTimeToUTC(formData.startDateTime),
      returnDateTime: qatarTimeToUTC(formData.returnDateTime),
      callTime: formData.callTime,
      wrapTime: formData.wrapTime,
      location: formData.location,
      focalPoint: formData.focalPoint,
      focalPointContact: formData.focalPointContact,
      driverNeeded: formData.driverNeeded,
      crewAssignments,
      departmentAcknowledgements,
      equipment,
      departmentsToApprove,
      departmentsToNotify,
      transportRequest: formData.driverNeeded ? {
        ...transportRequest,
        startDateTime: qatarTimeToUTC(transportRequest.startDateTime),
        returnDateTime: qatarTimeToUTC(transportRequest.returnDateTime)
      } : null,
      notifications,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSubmit(callSheetData);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/callsheet')}
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">
            {isTechnicalStoreMode ? 'Assign Driver & Equipment' : 'New Call Sheet'}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isTechnicalStoreMode
              ? 'Update driver assignment and equipment details'
              : 'Create a new call sheet with equipment and transportation requests'}
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
                    disabled={isTechnicalStoreMode}
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
                    readOnly={isTechnicalStoreMode}
                  />
                </div>

                {/* Start Date & Time */}
                <div className="space-y-2">
                  <Label htmlFor="startDateTime">
                    Start Date & Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startDateTime"
                    type="datetime-local"
                    value={formData.startDateTime}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    min={getCurrentQatarDateTime()}
                    disabled={isTechnicalStoreMode}
                    className={
                      isTechnicalStoreMode
                        ? 'bg-muted cursor-not-allowed'
                        : startDateError
                        ? 'border-red-500 focus-visible:ring-red-500'
                        : ''
                    }
                  />
                  {isTechnicalStoreMode ? (
                    <p className="text-xs text-muted-foreground">
                      Only the requester can modify this field
                    </p>
                  ) : startDateError ? (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{startDateError}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Qatar time (UTC+3) - Cannot select a past date and time
                    </p>
                  )}
                </div>

                {/* Return Date & Time */}
                <div className="space-y-2">
                  <Label htmlFor="returnDateTime">
                    Return Date & Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="returnDateTime"
                    type="datetime-local"
                    value={formData.returnDateTime}
                    onChange={(e) => handleReturnDateChange(e.target.value)}
                    min={formData.startDateTime || getCurrentQatarDateTime()}
                    disabled={isTechnicalStoreMode}
                    className={
                      isTechnicalStoreMode
                        ? 'bg-muted cursor-not-allowed'
                        : returnDateError
                        ? 'border-red-500 focus-visible:ring-red-500'
                        : ''
                    }
                  />
                  {isTechnicalStoreMode ? (
                    <p className="text-xs text-muted-foreground">
                      Only the requester can modify this field
                    </p>
                  ) : returnDateError ? (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{returnDateError}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Qatar time (UTC+3) - Must be after start date and time
                    </p>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="Filming location"
                    readOnly={isTechnicalStoreMode}
                  />
                </div>

                {/* Call Time */}
                <div className="space-y-2">
                  <Label htmlFor="callTime">Call Time</Label>
                  <Input
                    id="callTime"
                    type="time"
                    value={formData.callTime}
                    onChange={(e) => handleChange('callTime', e.target.value)}
                    readOnly={isTechnicalStoreMode}
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
                    readOnly={isTechnicalStoreMode}
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
                    readOnly={isTechnicalStoreMode}
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
                    readOnly={isTechnicalStoreMode}
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
                      disabled={isTechnicalStoreMode}
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

          {/* <Card>
            <CardHeader>
              <CardTitle>File Attachments</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <Input
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
          </Card> */}

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
            startDateTime={formData.startDateTime}
            returnDateTime={formData.returnDateTime}
            callsheetId={initialCallSheet?.id}
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {formData.driverNeeded && (
            <TransportForm
              transportRequest={transportRequest}
              onChange={handleTransportChange}
              notifications={notifications}
              onToggleNotification={handleToggleNotification}
              isTechnicalStoreMode={isTechnicalStoreMode}
            />
          )}

          <div className={formData.driverNeeded ? "pt-4" : ""}>
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
              {isTechnicalStoreMode ? 'Update Driver & Equipment' : 'Submit Call Sheet'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
