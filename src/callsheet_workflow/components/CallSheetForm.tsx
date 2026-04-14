import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Upload, X, MapPin, AlertCircle, Building2, Mail, Loader2, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AcknowledgementPanel } from './AcknowledgementPanel';
import { EquipmentForm } from './EquipmentForm';
import { TransportForm } from './TransportForm';
import { CallSheetPreview } from './CallSheetPreview';
import { CallSheetEmailModal } from './CallSheetEmailModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { CallSheetRequest, CrewAssignment, Equipment, DepartmentAcknowledgement, TransportRequest, Notification, ShootType, IndoorFacility } from '../types/callsheet';
import { DEPARTMENTS, DEFAULT_NOTIFICATIONS, DEPARTMENT_ACKNOWLEDGEMENTS, CALL_SHEET_ROLES, INDOOR_FACILITIES  } from '../types/callsheet';
import { getCurrentQatarDateTime } from '../utils/timezone';
import type { EquipmentRow } from '../types/equipmentRow';
import { createEmptyRow } from '../types/equipmentRow';

interface CallSheetFormProps {
  onSubmit: (data: Partial<CallSheetRequest>) => void;
  initialCallSheet?: CallSheetRequest;
  mode?: 'create' | 'edit' | 'technicalStore';
}

export const CallSheetForm: React.FC<CallSheetFormProps> = ({ onSubmit, initialCallSheet, mode = 'create' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('request');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editData = location.state?.editData;
  const duplicateData = location.state?.duplicateData;
  const isEditMode = mode === 'edit';
  /** When editing, exclude this callsheet from availability so its own reservations count toward free stock. */
  const excludeCallsheetIdForAvailability =
    isEditMode && editData?.id != null ? editData.id : initialCallSheet?.id;
  const isDuplicateMode = !!duplicateData;
  const isTechnicalStoreMode = mode === 'technicalStore';
  const hasCallSheetRole = user?.roles?.includes('CallSheet') || false;

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

  const [shootType, setShootType] = useState<ShootType>('Outdoor');
  const [indoorFacility, setIndoorFacility] = useState<IndoorFacility | null>(null);
  const [equipmentNeeded, setEquipmentNeeded] = useState<boolean>(false);
  const [startDateError, setStartDateError] = useState<string>('');
  const [returnDateError, setReturnDateError] = useState<string>('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const [crewAssignments, setCrewAssignments] = useState<CrewAssignment[]>([]);
  const [newCrew, setNewCrew] = useState({ role: '', name: '', phone: '' });

  const [departmentAcknowledgements, setDepartmentAcknowledgements] = useState<DepartmentAcknowledgement[]>(
    JSON.parse(JSON.stringify(DEPARTMENT_ACKNOWLEDGEMENTS))
  );

  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>([createEmptyRow()]);
  const [departmentsToApprove, setDepartmentsToApprove] = useState<string[]>([]);
  const [departmentsToNotify, setDepartmentsToNotify] = useState<string[]>([]);

  const [transportRequest, setTransportRequest] = useState<TransportRequest>({
    reason: '',
    startDateTime: '',
    returnDateTime: '',
    driverName: '',
    driverNo: '',
    requestedBy: 1 // TODO: replace with actual user context
  });

  const [notifications, setNotifications] = useState<Notification[]>(
    JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS))
  );

  // Initialize form with existing data if provided
  useEffect(() => {
    // Priority: editData > duplicateData > initialCallSheet
    if (editData && isEditMode) {
      // EDIT MODE: Keep ALL data including id, createdAt, updatedAt
      const startDateTime = editData.startDateTime ? editData.startDateTime.substring(0, 16) : '';
      const returnDateTime = editData.returnDateTime ? editData.returnDateTime.substring(0, 16) : '';

      setFormData({
        department: editData.department || '',
        title: editData.title || '',
        startDateTime: startDateTime,
        returnDateTime: returnDateTime,
        callTime: editData.callTime || '',
        wrapTime: editData.wrapTime || '',
        location: editData.location || '',
        focalPoint: editData.focalPoint || '',
        focalPointContact: editData.focalPointContact || '',
        driverNeeded: editData.driverNeeded || false
      });

      if (editData.shootType) setShootType(editData.shootType);
      if (editData.shootType === 'Indoor' && editData.location) setIndoorFacility(editData.location as IndoorFacility);
      if (editData.equipmentNeeded !== undefined) setEquipmentNeeded(editData.equipmentNeeded);
      if (editData.crewAssignments) setCrewAssignments(editData.crewAssignments);
      if (editData.departmentAcknowledgements) setDepartmentAcknowledgements(editData.departmentAcknowledgements);
      if (editData.equipment && editData.equipment.length > 0) {
        const mappedRows = editData.equipment.map((eq: Equipment) => ({
          tempId: `temp-${Date.now()}-${Math.random()}`,
          categoryId: eq.categoryId,
          inventoryItemId: eq.inventoryItemId,
          quantity: eq.quantity,
          category: eq.category,
          item: eq.item
        }));
        setEquipmentRows(mappedRows);
      }
      if (editData.transportRequest) setTransportRequest({
        reason: editData.transportRequest.reason || '',
        startDateTime: editData.transportRequest.startDateTime
          ? editData.transportRequest.startDateTime.substring(0, 16)
          : '',
        returnDateTime: editData.transportRequest.returnDateTime
          ? editData.transportRequest.returnDateTime.substring(0, 16)
          : '',
        driverName: editData.transportRequest.driverName || '',
        driverNo: editData.transportRequest.driverNo || '',
        carType: editData.transportRequest.carType || '',
        requestedBy: editData.transportRequest.requestedBy || 1
      });
      if (editData.departmentsToApprove) setDepartmentsToApprove(editData.departmentsToApprove);
      if (editData.departmentsToNotify) setDepartmentsToNotify(editData.departmentsToNotify);
      if (editData.notifications) setNotifications(editData.notifications);

    } else if (duplicateData) {
      // DUPLICATE MODE: Remove id, createdAt, updatedAt (create new call sheet)
      const startDateTime = duplicateData.startDateTime ? duplicateData.startDateTime.substring(0, 16) : '';
      const returnDateTime = duplicateData.returnDateTime ? duplicateData.returnDateTime.substring(0, 16) : '';

      setFormData({
        department: duplicateData.department || '',
        title: duplicateData.title || '',
        startDateTime: startDateTime,
        returnDateTime: returnDateTime,
        callTime: duplicateData.callTime || '',
        wrapTime: duplicateData.wrapTime || '',
        location: duplicateData.location || '',
        focalPoint: duplicateData.focalPoint || '',
        focalPointContact: duplicateData.focalPointContact || '',
        driverNeeded: duplicateData.driverNeeded || false
      });

      if (duplicateData.shootType) setShootType(duplicateData.shootType);
      if (duplicateData.shootType === 'Indoor' && duplicateData.location) setIndoorFacility(duplicateData.location as IndoorFacility);
      if (duplicateData.equipmentNeeded !== undefined) setEquipmentNeeded(duplicateData.equipmentNeeded);
      if (duplicateData.crewAssignments) setCrewAssignments(duplicateData.crewAssignments);
      if (duplicateData.departmentAcknowledgements) setDepartmentAcknowledgements(duplicateData.departmentAcknowledgements);
      if (duplicateData.equipment && duplicateData.equipment.length > 0) {
        const mappedRows = duplicateData.equipment.map((eq: Equipment) => ({
          tempId: `temp-${Date.now()}-${Math.random()}`,
          categoryId: eq.categoryId,
          inventoryItemId: eq.inventoryItemId,
          quantity: eq.quantity,
          category: eq.category,
          item: eq.item
        }));
        setEquipmentRows(mappedRows);
      }
      if (duplicateData.transportRequest) setTransportRequest({
        reason: duplicateData.transportRequest.reason || '',
        startDateTime: duplicateData.transportRequest.startDateTime
          ? duplicateData.transportRequest.startDateTime.substring(0, 16)
          : '',
        returnDateTime: duplicateData.transportRequest.returnDateTime
          ? duplicateData.transportRequest.returnDateTime.substring(0, 16)
          : '',
        driverName: '', // Do not duplicate - can be different per callsheet
        driverNo: '',   // Do not duplicate - can be different per callsheet
        carType: duplicateData.transportRequest.carType || '',
        requestedBy: duplicateData.transportRequest.requestedBy || 1
      });
      if (duplicateData.departmentsToApprove) setDepartmentsToApprove(duplicateData.departmentsToApprove);
      if (duplicateData.departmentsToNotify) setDepartmentsToNotify(duplicateData.departmentsToNotify);
      if (duplicateData.notifications) setNotifications(duplicateData.notifications);

    } else if (initialCallSheet) {
      // EXISTING LOGIC: Keep as is (for technicalStore mode or other uses)
      const startDateTime = initialCallSheet.startDateTime
        ? initialCallSheet.startDateTime.substring(0, 16)
        : '';
      const returnDateTime = initialCallSheet.returnDateTime
        ? initialCallSheet.returnDateTime.substring(0, 16)
        : '';

      setFormData({
        department: initialCallSheet.department || '',
        title: initialCallSheet.title || '',
        startDateTime: startDateTime,
        returnDateTime: returnDateTime,
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

      if (initialCallSheet.equipment && initialCallSheet.equipment.length > 0) {
        const mappedRows: EquipmentRow[] = initialCallSheet.equipment.map(eq => ({
          tempId: `temp-${Date.now()}-${Math.random()}`,
          categoryId: eq.categoryId,
          inventoryItemId: eq.inventoryItemId,
          quantity: eq.quantity,
          category: eq.category,
          item: eq.item
        }));
        setEquipmentRows(mappedRows);
      }

      if (initialCallSheet.transportRequest) {
        setTransportRequest({
          reason: initialCallSheet.transportRequest.reason || '',
          startDateTime: initialCallSheet.transportRequest.startDateTime
            ? initialCallSheet.transportRequest.startDateTime.substring(0, 16)
            : '',
          returnDateTime: initialCallSheet.transportRequest.returnDateTime
            ? initialCallSheet.transportRequest.returnDateTime.substring(0, 16)
            : '',
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
  }, [editData, duplicateData, initialCallSheet, isEditMode]);

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

  const handleShootTypeChange = (value: ShootType) => {
    setShootType(value);
    if (value === 'Outdoor') {
      setIndoorFacility(null);
      setEquipmentNeeded(false);
    } else {
      setFormData(prev => ({ ...prev, location: '', driverNeeded: false }));
    }
  };

  const handleAddCrew = () => {
    if (!newCrew.role || !newCrew.name) {
      alert('Please fill in role and name');
      return;
    }

    // Use _clientId only for list key and delete; never sent to API (avoids sending fake ids)
    const crew = {
      ...newCrew,
      _clientId: `crew-${Date.now()}-${Math.random().toString(36).slice(2)}`
    } as CrewAssignment & { _clientId?: string };

    setCrewAssignments([...crewAssignments, crew]);
    setNewCrew({ role: '', name: '', phone: '' });
  };

  const getCrewKey = (c: CrewAssignment & { _clientId?: string }) => c._clientId ?? c.id;
  const handleRemoveCrew = (key: number | string) => {
    setCrewAssignments(crewAssignments.filter(c => getCrewKey(c as CrewAssignment & { _clientId?: string }) !== key));
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

  const validateStep1 = (): boolean => {
    const missing: string[] = [];

    if (!formData.department) missing.push('Department');
    if (!formData.title.trim()) missing.push('Title');
    if (!formData.startDateTime) missing.push('Start Date & Time');
    if (!formData.returnDateTime) missing.push('Return Date & Time');
    if (shootType === 'Outdoor' && !formData.location.trim()) missing.push('Location');
    if (shootType === 'Indoor' && !indoorFacility) missing.push('Indoor Facility');

    if (startDateError) {
      showToast(startDateError, 'warning', 6000);
      return false;
    }
    if (returnDateError) {
      showToast(returnDateError, 'warning', 6000);
      return false;
    }

    if (missing.length > 0) {
      const fieldList = missing.join(', ');
      showToast(
        `The following required fields must be filled in before continuing: ${fieldList}.`,
        'warning',
        7000
      );
      return false;
    }

    return true;
  };

  const validateEquipmentAvailability = (): boolean => {
    const exceeds = equipmentRows.some(
      r => r.categoryId && r.inventoryItemId && r.quantity > 0 && r.exceedsAvailability
    );
    if (exceeds) {
      showToast(
        'One or more equipment lines exceed availability for the selected time. Adjust quantities or items before submitting.',
        'warning',
        7000
      );
      setActiveTab('equipment');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!validateStep1()) {
      setActiveTab('request');
      return;
    }

    if (!validateEquipmentAvailability()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const validEquipmentRows = equipmentRows.filter(r => r.categoryId && r.inventoryItemId && r.quantity > 0);

      const uniqueEquipment = new Map<number, Equipment>();
      validEquipmentRows.forEach(row => {
        const existing = uniqueEquipment.get(row.inventoryItemId!);
        if (existing) {
          existing.quantity += row.quantity;
        } else {
          uniqueEquipment.set(row.inventoryItemId!, {
            categoryId: row.categoryId!,
            inventoryItemId: row.inventoryItemId!,
            quantity: row.quantity,
            category: row.category ?? "",
            item: row.item ?? ""
          } as Equipment);
        }
      });

      const equipment = Array.from(uniqueEquipment.values());

      let finalLocation = '';
      if (shootType === 'Indoor') {
        finalLocation = indoorFacility || '';
      } else {
        finalLocation = formData.location;
      }

      // Convert datetime-local format (YYYY-MM-DDTHH:mm) to ISO string format
      // Just append ':00.000Z' to make it a valid ISO string, treating it as Qatar time
      const formatToISO = (dateTimeLocal: string): string => {
        if (!dateTimeLocal) return '';
        return `${dateTimeLocal}:00.000Z`;
      };

      const callSheetData: Partial<CallSheetRequest> = {
        department: formData.department,
        title: formData.title,
        startDateTime: formatToISO(formData.startDateTime),
        returnDateTime: formatToISO(formData.returnDateTime),
        callTime: formData.callTime,
        wrapTime: formData.wrapTime,
        shootType: shootType,
        location: finalLocation,
        equipmentNeeded: shootType === 'Indoor' ? equipmentNeeded : false,
        focalPoint: formData.focalPoint,
        focalPointContact: formData.focalPointContact,
        driverNeeded: formData.driverNeeded,
        crewAssignments: crewAssignments.map((c) => {
          const { _clientId, ...rest } = c as CrewAssignment & { _clientId?: string };
          return rest;
        }),
        departmentAcknowledgements,
        equipment,
        departmentsToApprove,
        departmentsToNotify,
        transportRequest: formData.driverNeeded ? {
          ...transportRequest,
          startDateTime: formatToISO(transportRequest.startDateTime),
          returnDateTime: formatToISO(transportRequest.returnDateTime)
        } : null,
        notifications,
        createdBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add id when editing
      if (isEditMode && editData?.id) {
        callSheetData.id = editData.id;
      }

      await onSubmit(callSheetData);
    } catch (error) {
      console.error('Submission error:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      {isSubmitting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-8 rounded-lg shadow-lg border border-border flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-card-foreground mb-1">
                {isEditMode ? 'Updating Call Sheet...' :
                 isTechnicalStoreMode ? 'Updating Information...' :
                 'Submitting Call Sheet...'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Please wait while we process your request
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/callsheet')}
            disabled={isSubmitting}
            className="shrink-0"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-card-foreground truncate">
              {isEditMode ? 'Edit Call Sheet' :
               isDuplicateMode ? 'Duplicate Call Sheet' :
               isTechnicalStoreMode ? 'Assign Driver & Equipment' :
               'New Call Sheet'}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5 truncate">
              {isEditMode
                ? 'Update the call sheet details'
                : isDuplicateMode
                ? 'Creating a copy of an existing call sheet'
                : isTechnicalStoreMode
                ? 'Update driver assignment and equipment details'
                : 'Create a new call sheet with equipment and transportation requests'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Announce email button for edit mode */}
          {hasCallSheetRole && initialCallSheet?.id && (() => {
            const isStoreCompleted = initialCallSheet?.status === 'Completed';
            const isCancelled = initialCallSheet?.status === 'Cancelled';
            return (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={(!isStoreCompleted || isCancelled) ? 'cursor-not-allowed' : undefined}>
                      <Button
                        onClick={() => setShowEmailModal(true)}
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={isCancelled || !isStoreCompleted}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Announce / Send Email
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!isStoreCompleted && !isCancelled && (
                    <TooltipContent side="bottom" className="max-w-xs text-center">
                      <div className="flex items-start gap-1.5">
                        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <p>Announcement emails can only be sent once the Technical Store has completed the call sheet. Current status: <strong>{initialCallSheet?.status}</strong></p>
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })()}

          {/* Cancel */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/callsheet')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          {/* Previous */}
          {!isTechnicalStoreMode && activeTab !== 'request' && (
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              className="gap-1.5"
              onClick={() => {
                const tabs = ['request', 'equipment', 'preview'];
                const currentIndex = tabs.indexOf(activeTab);
                setActiveTab(tabs[currentIndex - 1]);
              }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
          )}

          {/* Next / Submit */}
          {isTechnicalStoreMode ? (
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating...</>
              ) : (
                'Update Driver & Equipment'
              )}
            </Button>
          ) : activeTab !== 'preview' ? (
            <Button
              size="sm"
              disabled={isSubmitting}
              className="gap-1.5"
              onClick={() => {
                const tabs = ['request', 'equipment', 'preview'];
                const currentIndex = tabs.indexOf(activeTab);
                setActiveTab(tabs[currentIndex + 1]);
              }}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Submitting...'}
                </>
              ) : (
                <>{isEditMode ? 'Update Call Sheet' : 'Submit Call Sheet'}</>
              )}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={isSubmitting ? undefined : setActiveTab} className="w-full">
        <div className="sm:hidden mb-6">
          <Select
            value={activeTab}
            onValueChange={(val) => !isSubmitting && setActiveTab(val)}
            disabled={isSubmitting}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {activeTab === 'request' ? 'Call Sheet' : activeTab === 'equipment' ? 'Equipment Request' : 'Transportation'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="request">Call Sheet</SelectItem>
              <SelectItem value="equipment">Equipment Request</SelectItem>
              <SelectItem value="preview">Transportation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <TabsList className="w-full mb-6 hidden sm:grid sm:grid-cols-3">
          <TabsTrigger value="request" disabled={isSubmitting}>Call Sheet</TabsTrigger>
          <TabsTrigger value="equipment" disabled={isSubmitting}>Equipment Request</TabsTrigger>
          <TabsTrigger value="preview" disabled={isSubmitting}>Transportation</TabsTrigger>
        </TabsList>

        <TabsContent value="request" forceMount className={activeTab !== 'request' ? 'hidden space-y-6' : 'space-y-6'}>
          {isDuplicateMode && duplicateData && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Duplicating Call Sheet</AlertTitle>
              <AlertDescription>
                Creating a copy from: {duplicateData.title} ({new Date(duplicateData.startDateTime).toLocaleDateString()})
              </AlertDescription>
            </Alert>
          )}
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

                {/* Shoot Type */}
                <div className="space-y-2">
                  <Label>
                    Shoot Type <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleShootTypeChange('Outdoor')}
                      disabled={isTechnicalStoreMode}
                      className={`flex items-center justify-center gap-2 px-2 py-2 rounded-lg border-2 transition-all ${
                        shootType === 'Outdoor'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/50 text-muted-foreground'
                      } ${isTechnicalStoreMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <MapPin className="w-5 h-5" />
                      <span className="font-medium">Outdoor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShootTypeChange('Indoor')}
                      disabled={isTechnicalStoreMode}
                      className={`flex items-center justify-center gap-2 px-2 py-2 rounded-lg border-2 transition-all ${
                        shootType === 'Indoor'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/50 text-muted-foreground'
                      } ${isTechnicalStoreMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Building2 className="w-5 h-5" />
                      <span className="font-medium">Indoor</span>
                    </button>
                  </div>
                </div>

                {/* Location - Only show when Outdoor is selected */}
                {shootType === 'Outdoor' && (
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
                )}

                {/* Indoor Facility - Only show when Indoor is selected */}
                {shootType === 'Indoor' && (
                  <div className="space-y-2">
                    <Label>
                      Indoor Facility <span className="text-red-500">*</span>
                    </Label>
                    <RadioGroup
                      value={indoorFacility || ''}
                      onValueChange={(value) => setIndoorFacility(value as IndoorFacility)}
                      disabled={isTechnicalStoreMode}
                      className="flex flex-col gap-3"
                    >
                      {INDOOR_FACILITIES.map((facility) => (
                        <label
                          key={facility}
                          htmlFor={facility.toLowerCase().replace(/\s+/g, '-')}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all cursor-pointer ${
                            indoorFacility === facility
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          } ${isTechnicalStoreMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <RadioGroupItem
                            value={facility}
                            id={facility.toLowerCase().replace(/\s+/g, '-')}
                            className="flex-shrink-0"
                          />
                          <span className="font-medium text-sm">{facility}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                )}

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

                {/* Equipment Needed - Only show when Indoor is selected */}
                {/* {shootType === 'Indoor' && (
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="equipmentNeeded"
                        checked={equipmentNeeded}
                        onCheckedChange={(checked) => setEquipmentNeeded(checked as boolean)}
                        disabled={isTechnicalStoreMode}
                      />
                      <Label
                        htmlFor="equipmentNeeded"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Equipment Needed
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      If equipment is needed, this request will go to the Technical Store for confirmation. If no equipment is needed, it will be submitted directly and the announcement can be made without Technical Store approval.
                    </p>
                  </div>
                )} */}

                {/* Driver Needed - Hide when Indoor is selected */}
                {shootType !== 'Indoor' && (
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
                )}

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
                  name="crew-name"
                  autoComplete="name"
                />
                <Input
                  value={newCrew.phone}
                  onChange={(e) => setNewCrew({ ...newCrew, phone: e.target.value })}
                  placeholder="Phone"
                  name="crew-phone"
                  autoComplete="tel"
                />
              </div>

              <Button onClick={handleAddCrew} className="mb-4">
                <Plus size={18} className="mr-2" />
                Add Assignment
              </Button>

              {crewAssignments.length > 0 && (
                <Card className="border border-border">
                  <div className="overflow-x-auto">
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
                          <TableRow key={getCrewKey(crew as CrewAssignment & { _clientId?: string })}>
                            <TableCell>{crew.role}</TableCell>
                            <TableCell>{crew.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {crew.phone}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveCrew(getCrewKey(crew as CrewAssignment & { _clientId?: string }))}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="equipment" forceMount className={activeTab !== 'equipment' ? 'hidden space-y-6' : 'space-y-6'}>
          <EquipmentForm
            equipmentRows={equipmentRows}
            setEquipmentRows={setEquipmentRows}
            departmentsToApprove={departmentsToApprove}
            departmentsToNotify={departmentsToNotify}
            onDepartmentsToApproveChange={setDepartmentsToApprove}
            onDepartmentsToNotifyChange={setDepartmentsToNotify}
            startDateTime={formData.startDateTime}
            returnDateTime={formData.returnDateTime}
            callsheetId={excludeCallsheetIdForAvailability}
          />
        </TabsContent>

        <TabsContent value="preview" forceMount className={activeTab !== 'preview' ? 'hidden space-y-6' : 'space-y-6'}>
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
                equipment: equipmentRows
                  .filter(r => r.categoryId && r.inventoryItemId && r.quantity > 0)
                  .map(r => ({
                    category: r.category ?? "",
                    item: r.item ?? "",
                    quantity: r.quantity,
                    categoryId: r.categoryId!,
                    inventoryItemId: r.inventoryItemId!
                  } as Equipment)),
                transportRequest,
                departmentsToApprove,
                departmentsToNotify
              }}
            />
          </div>
        </TabsContent>
      </Tabs>


      {initialCallSheet && (
        <CallSheetEmailModal
          open={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          callSheet={initialCallSheet}
          onSuccess={() => {
            setShowEmailModal(false);
          }}
        />
      )}
    </div>
  );
};
