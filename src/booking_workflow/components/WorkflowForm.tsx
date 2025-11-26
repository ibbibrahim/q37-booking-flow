import React, { useState, useMemo } from "react";
import { Send, ArrowLeft, Calendar, Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  BookingType,
  WorkflowRequest,
  WorkflowStatus,
} from "../types/workflow";

interface WorkflowFormProps {
  onSubmit: (data: Partial<WorkflowRequest>, status: WorkflowStatus) => void;
  onCancel: () => void;
}

type BookingMode = 'single' | 'bulk';
type FrequencyType = 'everyday' | 'weekdays' | 'specific' | 'custom';

const DAYS_OF_WEEK = [
  { key: 'sun', label: 'Su', full: 'Sunday' },
  { key: 'mon', label: 'Mo', full: 'Monday' },
  { key: 'tue', label: 'Tu', full: 'Tuesday' },
  { key: 'wed', label: 'We', full: 'Wednesday' },
  { key: 'thu', label: 'Th', full: 'Thursday' },
  { key: 'fri', label: 'Fr', full: 'Friday' },
  { key: 'sat', label: 'Sa', full: 'Saturday' },
];

export const WorkflowForm: React.FC<WorkflowFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [bookingMode, setBookingMode] = useState<BookingMode>('single');
  const [formData, setFormData] = useState<Record<string, string>>({
    bookingType: "",
    title: "",
    program: "",
    airDateTime: "",
    language: "",
    priority: "",
    nocRequired: "",
    resourcesNeeded: "",
    newsroomTicket: "",
    complianceTags: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Bulk booking state
  const [bulkOptions, setBulkOptions] = useState({
    startDate: "",
    endDate: "",
    frequency: "everyday" as FrequencyType,
    selectedDays: ['sun', 'mon', 'tue', 'wed', 'thu'] as string[],
    appendDate: true,
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<WorkflowStatus | null>(null);

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleBulkOptionChange = (name: string, value: any) => {
    setBulkOptions((prev) => ({ ...prev, [name]: value }));
  };

  const toggleDay = (day: string) => {
    setBulkOptions((prev) => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(day)
        ? prev.selectedDays.filter(d => d !== day)
        : [...prev.selectedDays, day]
    }));
  };

  // Calculate bulk booking dates
  const bulkDates = useMemo(() => {
    if (bookingMode !== 'bulk' || !bulkOptions.startDate || !bulkOptions.endDate) {
      return [];
    }

    const start = new Date(bulkOptions.startDate);
    const end = new Date(bulkOptions.endDate);
    const dates: Date[] = [];

    if (start > end) return [];

    let current = new Date(start);
    while (current <= end) {
      const dayIndex = current.getDay();
      let include = false;

      switch (bulkOptions.frequency) {
        case 'everyday':
          include = true;
          break;
        case 'weekdays':
          include = dayIndex >= 0 && dayIndex <= 4; // Sun-Thu
          break;
        case 'specific':
          const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
          include = bulkOptions.selectedDays.includes(dayKeys[dayIndex]);
          break;
      }

      if (include) {
        dates.push(new Date(current));
      }

      current.setDate(current.getDate() + 1);
    }

    return dates;
  }, [bookingMode, bulkOptions]);

  const formatDateForPreview = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const generateTitleForDate = (date: Date, index: number) => {
    if (bookingMode === 'single') return formData.title;

    let title = formData.title;
    if (bulkOptions.appendDate) {
      title += ` – ${formatDateForPreview(date)}`;
    }
    return title;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.bookingType) {
      newErrors.bookingType = "Please select a booking type";
    }
    if (!formData.title) {
      newErrors.title = "Title is required";
    }
    if (!formData.program) {
      newErrors.program = "Program/Segment is required";
    }
    if (!formData.airDateTime) {
      newErrors.airDateTime = "Air date and time is required";
    }
    if (!formData.language) {
      newErrors.language = "Please select a language";
    }
    if (!formData.priority) {
      newErrors.priority = "Please select a priority";
    }

    // Bulk booking validation
    if (bookingMode === 'bulk') {
      if (!bulkOptions.startDate) {
        newErrors.bulkStartDate = "Start date is required for bulk booking";
      }
      if (!bulkOptions.endDate) {
        newErrors.bulkEndDate = "End date is required for bulk booking";
      }
      if (bulkOptions.frequency === 'specific' && bulkOptions.selectedDays.length === 0) {
        newErrors.bulkDays = "Please select at least one day";
      }
      if (bulkDates.length === 0) {
        newErrors.bulkDates = "No valid dates in the selected range";
      }
    }

    if (formData.bookingType === "Incoming Feed") {
      if (!formData.feedStartTime) {
        newErrors.feedStartTime = "Feed start time is required";
      }
      if (!formData.feedEndTime) {
        newErrors.feedEndTime = "Feed end time is required";
      }
      if (!formData.studio) {
        newErrors.studio = "Please select a studio";
      }
    }

    if (
      formData.bookingType === "Invite Guest for News" ||
      formData.bookingType === "Invite Guest for Program"
    ) {
      if (!formData.guestName) {
        newErrors.guestName = "Guest name is required";
      }
      if (!formData.inewsRundownId) {
        newErrors.inewsRundownId = "iNEWS Rundown ID is required";
      }
      if (!formData.studio) {
        newErrors.studio = "Please select a studio";
      }
    }

    if (formData.bookingType === "Download and Ingest") {
      if (!formData.downloadSource) {
        newErrors.downloadSource = "Please select a download source";
      }
      if (!formData.downloadLink) {
        newErrors.downloadLink = "Download link/URL is required";
      } else {
        const urlPattern = /^(https?:\/\/)([\w\-]+(\.[\w\-]+)+)([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/i;
        if (!urlPattern.test(formData.downloadLink.trim())) {
          newErrors.downloadLink = "Please enter a valid URL (must start with http or https)";
        }
      }
    }

    if (formData.bookingType === "Camera Card and Ingest") {
      if (!formData.cameraCardNumber) {
        newErrors.cameraCardNumber = "Camera Card Number is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (status: WorkflowStatus, skipValidation = false) => {
    if (skipValidation || validateForm()) {
      if (bookingMode === 'bulk' && bulkDates.length > 1) {
        setPendingSubmit(status);
        setShowConfirmModal(true);
      } else {
        executeSubmit(status);
      }
    }
  };

  const executeSubmit = (status: WorkflowStatus) => {
    let typeSpecific: Record<string, any> = {};

    switch (formData.bookingType) {
      case "Invite Guest for News":
      case "Invite Guest for Program":
        typeSpecific = {
          guestName: formData.guestName,
          guestContact: formData.guestContact,
          inewsRundownId: formData.inewsRundownId,
          storySlug: formData.storySlug,
          rundownPosition: formData.rundownPosition,
        };
        break;

      case "Download and Ingest":
        typeSpecific = {
          downloadSource: formData.downloadSource,
          downloadLink: formData.downloadLink,
        };
        break;

      case "Camera Card and Ingest":
        typeSpecific = {
          cameraCardNumber: formData.cameraCardNumber,
        };
        break;

      default:
        typeSpecific = {};
        break;
    }

    if (bookingMode === 'single') {
      const payload = {
        ...formData,
        typeSpecificData: JSON.stringify(typeSpecific),
      };
      onSubmit(payload as any, status);
    } else {
      // Bulk submission - submit multiple bookings
      bulkDates.forEach((date, index) => {
        const airDate = new Date(formData.airDateTime);
        const newAirDateTime = new Date(date);
        newAirDateTime.setHours(airDate.getHours(), airDate.getMinutes(), 0, 0);

        const payload = {
          ...formData,
          title: generateTitleForDate(date, index),
          airDateTime: newAirDateTime.toISOString(),
          typeSpecificData: JSON.stringify(typeSpecific),
        };

        // Submit each booking
        onSubmit(payload as any, status);
      });
    }

    setShowConfirmModal(false);
    setPendingSubmit(null);
  };

  const renderGuestRundownFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="guestName">
          Guest Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="guestName"
          value={formData.guestName || ""}
          onChange={(e) => handleChange("guestName", e.target.value)}
          className={errors.guestName ? "border-red-500" : ""}
        />
        {errors.guestName && (
          <p className="text-sm text-red-500">{errors.guestName}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="guestContact">Guest Contact</Label>
        <Input
          id="guestContact"
          value={formData.guestContact || ""}
          onChange={(e) => handleChange("guestContact", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inewsRundownId">
          iNEWS Rundown ID <span className="text-red-500">*</span>
        </Label>
        <Input
          id="inewsRundownId"
          value={formData.inewsRundownId || ""}
          onChange={(e) => handleChange("inewsRundownId", e.target.value)}
          className={errors.inewsRundownId ? "border-red-500" : ""}
        />
        {errors.inewsRundownId && (
          <p className="text-sm text-red-500">{errors.inewsRundownId}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="storySlug">Story Slug</Label>
        <Input
          id="storySlug"
          value={formData.storySlug || ""}
          onChange={(e) => handleChange("storySlug", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="rundownPosition">Rundown Position</Label>
        <Input
          id="rundownPosition"
          value={formData.rundownPosition || ""}
          onChange={(e) => handleChange("rundownPosition", e.target.value)}
        />
      </div>
    </>
  );

  const renderDownloadAndIngestFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="downloadSource">
          Download Source <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.downloadSource || ""}
          onValueChange={(value) => handleChange("downloadSource", value)}
        >
          <SelectTrigger id="downloadSource" className={errors.downloadSource ? "border-red-500" : ""}>
            <SelectValue placeholder="Select download source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="YouTube">YouTube</SelectItem>
            <SelectItem value="WeTransfer">WeTransfer</SelectItem>
            <SelectItem value="FTP">FTP</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        {errors.downloadSource && (
          <p className="text-sm text-red-500">{errors.downloadSource}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="downloadLink">
          Download Link / URL <span className="text-red-500">*</span>
        </Label>
        <Input
          id="downloadLink"
          value={formData.downloadLink || ""}
          onChange={(e) => handleChange("downloadLink", e.target.value)}
          className={errors.downloadLink ? "border-red-500" : ""}
        />
        {errors.downloadLink && (
          <p className="text-sm text-red-500">{errors.downloadLink}</p>
        )}
      </div>
    </>
  );

  const renderCameraCardFields = () => (
    <div className="space-y-2">
      <Label htmlFor="cameraCardNumber">
        Camera Card Quantity <span className="text-red-500">*</span>
      </Label>
      <Input
        id="cameraCardNumber"
        type="number"
        value={formData.cameraCardNumber || ""}
        onChange={(e) => handleChange("cameraCardNumber", e.target.value)}
        className={errors.cameraCardNumber ? "border-red-500" : ""}
      />
      {errors.cameraCardNumber && (
        <p className="text-sm text-red-500">{errors.cameraCardNumber}</p>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">New Workflow Request</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create a new booking request for NOC and Ingest teams
          </p>
        </div>
      </div>

      {/* Booking Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Booking Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={bookingMode === 'single' ? 'default' : 'outline'}
              onClick={() => setBookingMode('single')}
              className="flex-1"
            >
              <span className={`mr-2 ${bookingMode === 'single' ? '●' : '○'}`}></span>
              Single Booking
            </Button>
            <Button
              type="button"
              variant={bookingMode === 'bulk' ? 'default' : 'outline'}
              onClick={() => setBookingMode('bulk')}
              className="flex-1"
            >
              <span className={`mr-2 ${bookingMode === 'bulk' ? '●' : '○'}`}></span>
              Bulk / Series Booking
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner for Bulk Mode */}
      {bookingMode === 'bulk' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Bulk mode: We'll create multiple bookings using this form as a template. Review carefully before submitting.
          </AlertDescription>
        </Alert>
      )}

      {/* Bulk Booking Options */}
      {bookingMode === 'bulk' && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Booking Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Range */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">Date Range</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  We'll create one booking per selected day, based on the pattern below.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkStartDate">
                    Start Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="bulkStartDate"
                    type="date"
                    value={bulkOptions.startDate}
                    onChange={(e) => handleBulkOptionChange('startDate', e.target.value)}
                    className={errors.bulkStartDate ? "border-red-500" : ""}
                  />
                  {errors.bulkStartDate && (
                    <p className="text-sm text-red-500">{errors.bulkStartDate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulkEndDate">
                    End Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="bulkEndDate"
                    type="date"
                    value={bulkOptions.endDate}
                    onChange={(e) => handleBulkOptionChange('endDate', e.target.value)}
                    min={bulkOptions.startDate}
                    className={errors.bulkEndDate ? "border-red-500" : ""}
                  />
                  {errors.bulkEndDate && (
                    <p className="text-sm text-red-500">{errors.bulkEndDate}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Frequency */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={bulkOptions.frequency}
                  onValueChange={(value) => handleBulkOptionChange('frequency', value as FrequencyType)}
                >
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyday">Every day</SelectItem>
                    <SelectItem value="weekdays">Weekdays only (Sun–Thu)</SelectItem>
                    <SelectItem value="specific">Specific days of week</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Day Selection */}
              {bulkOptions.frequency === 'specific' && (
                <div className="space-y-2">
                  <Label>Select Days</Label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS_OF_WEEK.map((day) => (
                      <Button
                        key={day.key}
                        type="button"
                        variant={bulkOptions.selectedDays.includes(day.key) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleDay(day.key)}
                        className="w-12 h-12"
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                  {errors.bulkDays && (
                    <p className="text-sm text-red-500">{errors.bulkDays}</p>
                  )}
                </div>
              )}
            </div>

            {/* Title Pattern */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="appendDate"
                  checked={bulkOptions.appendDate}
                  onCheckedChange={(checked) => handleBulkOptionChange('appendDate', checked)}
                />
                <Label htmlFor="appendDate" className="cursor-pointer">
                  Append date to title automatically
                </Label>
              </div>
            </div>

            {/* Occurrences Summary */}
            {bulkDates.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label>Occurrences</Label>
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {bulkDates.length} bookings
                  </Badge>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium">Preview (first 5):</p>
                  {bulkDates.slice(0, 5).map((date, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      • {generateTitleForDate(date, index)} – {formatDateForPreview(date)}
                    </div>
                  ))}
                  {bulkDates.length > 5 && (
                    <p className="text-xs text-muted-foreground italic">
                      ...and {bulkDates.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {errors.bulkDates && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.bulkDates}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Booking Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bookingType">
                  Booking Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.bookingType}
                  onValueChange={(value) => handleChange("bookingType", value)}
                >
                  <SelectTrigger id="bookingType" className={errors.bookingType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select booking type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Incoming Feed">Incoming Feed</SelectItem>
                    <SelectItem value="Invite Guest for News">Invite Guest for News</SelectItem>
                    <SelectItem value="Invite Guest for Program">Invite Guest for Program</SelectItem>
                    <SelectItem value="Download and Ingest">Download and Ingest</SelectItem>
                    <SelectItem value="Camera Card and Ingest">Camera Card and Ingest</SelectItem>
                  </SelectContent>
                </Select>
                {errors.bookingType && (
                  <p className="text-sm text-red-500">{errors.bookingType}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title {bookingMode === 'bulk' && <span className="text-xs text-muted-foreground">(Template)</span>} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className={errors.title ? "border-red-500" : ""}
                  placeholder={bookingMode === 'bulk' ? "e.g., Evening News – Episode" : ""}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title}</p>
                )}
              </div>
            </div>

            {(formData.bookingType === "Incoming Feed" ||
              formData.bookingType === "Invite Guest for News" ||
              formData.bookingType === "Invite Guest for Program") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="studio">
                    Studio <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.studio || ""}
                    onValueChange={(value) => handleChange("studio", value)}
                  >
                    <SelectTrigger id="studio" className={errors.studio ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select studio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Studio 1">Studio 1</SelectItem>
                      <SelectItem value="Studio 2">Studio 2</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.studio && (
                    <p className="text-sm text-red-500">{errors.studio}</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="program">
                  Program / Segment <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="program"
                  value={formData.program}
                  onChange={(e) => handleChange("program", e.target.value)}
                  placeholder="e.g., Evening News"
                  className={errors.program ? "border-red-500" : ""}
                />
                {errors.program && (
                  <p className="text-sm text-red-500">{errors.program}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="airDateTime">
                  {formData.bookingType === "Download and Ingest" ||
                  formData.bookingType === "Camera Card and Ingest"
                    ? "Ingest Time"
                    : bookingMode === 'bulk' ? "Air Time (Template)" : "Air Date / Time (Local)"}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="airDateTime"
                  type="datetime-local"
                  value={formData.airDateTime}
                  onChange={(e) => handleChange("airDateTime", e.target.value)}
                  className={errors.airDateTime ? "border-red-500" : ""}
                />
                {bookingMode === 'bulk' && (
                  <p className="text-xs text-muted-foreground">
                    Time will be applied to all bookings. Dates come from Bulk Booking Options.
                  </p>
                )}
                {errors.airDateTime && (
                  <p className="text-sm text-red-500">{errors.airDateTime}</p>
                )}
              </div>
            </div>

            {(formData.bookingType === "Incoming Feed" ||
              formData.bookingType === "Invite Guest for News" ||
              formData.bookingType === "Invite Guest for Program") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="feedStartTime">
                    Feed Start Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="feedStartTime"
                    type="datetime-local"
                    value={formData.feedStartTime || ""}
                    onChange={(e) => handleChange("feedStartTime", e.target.value)}
                    className={errors.feedStartTime ? "border-red-500" : ""}
                  />
                  {errors.feedStartTime && (
                    <p className="text-sm text-red-500">{errors.feedStartTime}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedEndTime">
                    Feed End Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="feedEndTime"
                    type="datetime-local"
                    value={formData.feedEndTime || ""}
                    onChange={(e) => handleChange("feedEndTime", e.target.value)}
                    min={formData.feedStartTime || ""}
                    className={errors.feedEndTime ? "border-red-500" : ""}
                  />
                  {errors.feedEndTime && (
                    <p className="text-sm text-red-500">{errors.feedEndTime}</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="language">
                  Language <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => handleChange("language", value)}
                >
                  <SelectTrigger id="language" className={errors.language ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Arabic">Arabic</SelectItem>
                  </SelectContent>
                </Select>
                {errors.language && (
                  <p className="text-sm text-red-500">{errors.language}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">
                  Priority <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => handleChange("priority", value)}
                >
                  <SelectTrigger id="priority" className={errors.priority ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && (
                  <p className="text-sm text-red-500">{errors.priority}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {(formData.bookingType === "Invite Guest for News" ||
          formData.bookingType === "Invite Guest for Program") && (
          <Card>
            <CardHeader>
              <CardTitle>Guest & Rundown Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderGuestRundownFields()}
              </div>
            </CardContent>
          </Card>
        )}

        {formData.bookingType === "Download and Ingest" && (
          <Card>
            <CardHeader>
              <CardTitle>Download Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderDownloadAndIngestFields()}
              </div>
            </CardContent>
          </Card>
        )}

        {formData.bookingType === "Camera Card and Ingest" && (
          <Card>
            <CardHeader>
              <CardTitle>Camera Card Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderCameraCardFields()}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="resourcesNeeded">Resources Needed (Booking)</Label>
                <Input
                  id="resourcesNeeded"
                  value={formData.resourcesNeeded}
                  onChange={(e) => handleChange("resourcesNeeded", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>

          <Button
            type="button"
            onClick={() => {
              if (
                formData.bookingType === "Download and Ingest" ||
                formData.bookingType === "Camera Card and Ingest"
              ) {
                handleSubmit("With Ingest");
              } else {
                handleSubmit("With NOC");
              }
            }}
          >
            <Send className="mr-2 h-4 w-4" />
            {bookingMode === 'bulk' && bulkDates.length > 1
              ? `Create ${bulkDates.length} Bookings`
              : formData.bookingType === "Download and Ingest" ||
                formData.bookingType === "Camera Card and Ingest"
              ? "Submit Request to Ingest"
              : "Submit Request to NOC"}
          </Button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Booking Creation</DialogTitle>
            <DialogDescription>
              You're about to create {bulkDates.length} bookings from{' '}
              {bulkDates[0] && formatDateForPreview(bulkDates[0])} to{' '}
              {bulkDates[bulkDates.length - 1] && formatDateForPreview(bulkDates[bulkDates.length - 1])}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
              <p className="text-sm font-medium mb-2">Bookings to be created:</p>
              {bulkDates.map((date, index) => (
                <div key={index} className="text-sm text-muted-foreground">
                  {index + 1}. {generateTitleForDate(date, index)} – {formatDateForPreview(date)}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => pendingSubmit && executeSubmit(pendingSubmit)}>
              Create {bulkDates.length} Bookings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
