import React, { useState, useMemo } from "react";
import { Send, ArrowLeft, Calendar, Info, AlertCircle, Plus, X } from "lucide-react";
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
import { TimePickerInput } from "./TimePickerInput";
import {
  getBookingTypeLabel,
  type BookingType,
  type WorkflowRequest,
  type WorkflowStatus,
} from "../types/workflow";

interface WorkflowFormProps {
  onSubmit: (data: Partial<WorkflowRequest>, status: WorkflowStatus) => void;
  onCancel: () => void;
  initialData?: WorkflowRequest | null;
  isEditMode?: boolean;
}

type BookingMode = 'single' | 'bulk';
type FrequencyType = 'everyday' | 'weekdays' | 'specific' | 'custom';

interface DownloadLink {
  source: string;
  url: string;
}

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
  initialData,
  isEditMode = false,
}) => {
  const [bookingMode, setBookingMode] = useState<BookingMode>('single');

  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>(() => {
    if (initialData && initialData.bookingType === "Download and Ingest" && initialData.downloadLinks) {
      return initialData.downloadLinks.map(link => ({
        source: link.source,
        url: link.url
      }));
    }
    return [{ source: '', url: '' }];
  });

  const [formData, setFormData] = useState<Record<string, string>>(() => {
    if (initialData) {
      let cameraCardVideoQty = "";
      let cameraCardAudioQty = "";
      let guestName = "";
      let guestContact = "";
      let inewsRundownId = "";
      let storySlug = "";
      let rundownPosition = "";

      if (initialData.bookingType === "Camera Card and Ingest" && initialData.cameraCardDetail) {
        cameraCardVideoQty = String(initialData.cameraCardDetail.videoQuantity);
        cameraCardAudioQty = String(initialData.cameraCardDetail.audioQuantity);
      }

      if ((initialData.bookingType === "Invite Guest for News" || initialData.bookingType === "Invite Guest for Program") && initialData.guestDetail) {
        guestName = initialData.guestDetail.guestName;
        guestContact = initialData.guestDetail.guestContact;
      }

      const airDate = initialData.airDateTime ? new Date(initialData.airDateTime).toISOString().split('T')[0] : "";
      const airTimeSingle = initialData.airDateTime ? new Date(initialData.airDateTime).toTimeString().slice(0, 5) : "";

      return {
        bookingType: initialData.bookingType || "",
        title: initialData.title || "",
        program: initialData.program || "",
        airDateTime: initialData.airDateTime || "",
        airDate,
        airTime: "",
        airTimeSingle,
        feedStartTime: initialData.feedStartTime || "",
        feedEndTime: initialData.feedEndTime || "",
        feedStartTimeOnly: initialData.feedStartTime ? new Date(initialData.feedStartTime).toTimeString().slice(0, 5) : "",
        feedEndTimeOnly: initialData.feedEndTime ? new Date(initialData.feedEndTime).toTimeString().slice(0, 5) : "",
        language: initialData.language || "Arabic",
        priority: initialData.priority || "",
        nocRequired: "",
        resourcesNeeded: initialData.resourcesNeeded || "",
        newsroomTicket: "",
        complianceTags: "",
        notes: initialData.notes || "",
        studio: initialData.studio || "",
        cameraCardVideoQuantity: cameraCardVideoQty,
        cameraCardAudioQuantity: cameraCardAudioQty,
        guestName,
        guestContact,
        inewsRundownId,
        storySlug,
        rundownPosition,
      };
    }
    return {
      bookingType: "",
      title: "",
      program: "",
      airDateTime: "",
      airDate: "",
      airTime: "",
      airTimeSingle: "",
      feedStartTime: "",
      feedEndTime: "",
      feedStartTimeOnly: "",
      feedEndTimeOnly: "",
      language: "Arabic",
      priority: "",
      nocRequired: "",
      resourcesNeeded: "",
      newsroomTicket: "",
      complianceTags: "",
      notes: "",
      cameraCardVideoQuantity: "",
      cameraCardAudioQuantity: "",
      guestName: "",
      guestContact: "",
      inewsRundownId: "",
      storySlug: "",
      rundownPosition: "",
    };
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

  const addDownloadLink = () => {
    setDownloadLinks([...downloadLinks, { source: '', url: '' }]);
  };

  const removeDownloadLink = (index: number) => {
    if (downloadLinks.length > 1) {
      setDownloadLinks(downloadLinks.filter((_, i) => i !== index));
      const newErrors = { ...errors };
      delete newErrors[`downloadLink_${index}_source`];
      delete newErrors[`downloadLink_${index}_url`];
      setErrors(newErrors);
    }
  };

  const updateDownloadLink = (index: number, field: 'source' | 'url', value: string) => {
    const updated = [...downloadLinks];
    updated[index][field] = value;
    setDownloadLinks(updated);
    if (errors[`downloadLink_${index}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`downloadLink_${index}_${field}`];
      setErrors(newErrors);
    }
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

    // In bulk mode, only validate time; in single mode, validate date and time
    const isDownloadOrCameraCard = formData.bookingType === "Download and Ingest" ||
                                    formData.bookingType === "Camera Card and Ingest";

    if (bookingMode === 'bulk') {
      if (!formData.airTime) {
        newErrors.airTime = "Air time is required";
      }
    } else {
      if (!isDownloadOrCameraCard) {
        if (!formData.airDate) {
          newErrors.airDate = "Air date is required";
        }
        if (!formData.airTimeSingle) {
          newErrors.airTimeSingle = "Air time is required";
        }
      }
    }

    const hidePriorityTypes = ['Incoming Feed', 'Invite Guest for News', 'Invite Guest for Program'];
    if (!hidePriorityTypes.includes(formData.bookingType) && !formData.priority) {
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
      if (!formData.feedStartTimeOnly) {
        newErrors.feedStartTimeOnly = "Feed start time is required";
      }
      if (!formData.feedEndTimeOnly) {
        newErrors.feedEndTimeOnly = "Feed end time is required";
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
      if (!formData.guestContact) {
        newErrors.guestContact = "Guest contact/email is required";
      }
      if (!formData.studio) {
        newErrors.studio = "Please select a studio";
      }
      // Feed times for guest bookings
      if (!formData.feedStartTimeOnly) {
        newErrors.feedStartTimeOnly = "Feed start time is required";
      }
      if (!formData.feedEndTimeOnly) {
        newErrors.feedEndTimeOnly = "Feed end time is required";
      }
    }

    if (formData.bookingType === "Download and Ingest") {
      if (downloadLinks.length === 0) {
        newErrors.downloadLinks = "At least one download link is required";
      } else {
        const urlPattern = /^(https?:\/\/)([\w\-]+(\.[\w\-]+)+)([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/i;
        downloadLinks.forEach((link, index) => {
          if (!link.source) {
            newErrors[`downloadLink_${index}_source`] = "Source is required";
          }
          if (!link.url) {
            newErrors[`downloadLink_${index}_url`] = "URL is required";
          } else if (!urlPattern.test(link.url.trim())) {
            newErrors[`downloadLink_${index}_url`] = "Please enter a valid URL (must start with http or https)";
          }
        });
      }
    }

    if (formData.bookingType === "Camera Card and Ingest") {
      if (!formData.cameraCardVideoQuantity || Number(formData.cameraCardVideoQuantity) < 0) {
        newErrors.cameraCardVideoQuantity = "Camera Card Video Quantity is required";
      }
      if (!formData.cameraCardAudioQuantity || Number(formData.cameraCardAudioQuantity) < 0) {
        newErrors.cameraCardAudioQuantity = "Camera Card Audio Quantity is required";
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

  // Remove empty date fields so backend doesn't get "" for DateTime?
  const normalizePayload = (payload: any) => {
    const cleaned = { ...payload };

    if (!cleaned.feedStartTime) {
      delete cleaned.feedStartTime;
    }

    if (!cleaned.feedEndTime) {
      delete cleaned.feedEndTime;
    }

    return cleaned;
  };

  const executeSubmit = (status: WorkflowStatus) => {
    const hidePriorityTypes = ['Incoming Feed', 'Invite Guest for News', 'Invite Guest for Program'];

    const basePayload: any = {
      ...formData,
      priority: hidePriorityTypes.includes(formData.bookingType) ? 'Normal' : formData.priority,
    };

    switch (formData.bookingType) {
      case "Invite Guest for News":
      case "Invite Guest for Program":
        basePayload.guestDetail = {
          guestName: formData.guestName,
          guestContact: formData.guestContact,
        };
        break;

      case "Download and Ingest":
        basePayload.downloadLinks = downloadLinks.map(link => ({
          source: link.source,
          url: link.url,
          ingestStatus: 'Pending'
        }));
        break;

      case "Camera Card and Ingest":
        basePayload.cameraCardDetail = {
          videoQuantity: Number(formData.cameraCardVideoQuantity),
          audioQuantity: Number(formData.cameraCardAudioQuantity),
        };
        break;
    }

    if (bookingMode === 'single') {
      const isDownloadOrCameraCard = formData.bookingType === "Download and Ingest" ||
                                      formData.bookingType === "Camera Card and Ingest";

      let finalAirDateTime;
      if (isDownloadOrCameraCard) {
        finalAirDateTime = new Date().toISOString();
      } else if (formData.airDate && formData.airTimeSingle) {
        const [hours, minutes] = formData.airTimeSingle.split(':').map(Number);
        const airDateObj = new Date(formData.airDate);
        airDateObj.setHours(hours, minutes, 0, 0);
        finalAirDateTime = airDateObj.toISOString();
      }

      let newFeedStartTime = undefined;
      let newFeedEndTime = undefined;

      if (formData.feedStartTimeOnly && formData.feedEndTimeOnly && formData.airDate) {
        const airDate = new Date(formData.airDate);
        const [startHours, startMinutes] = formData.feedStartTimeOnly.split(':').map(Number);
        const [endHours, endMinutes] = formData.feedEndTimeOnly.split(':').map(Number);

        newFeedStartTime = new Date(airDate);
        newFeedStartTime.setHours(startHours, startMinutes, 0, 0);

        newFeedEndTime = new Date(airDate);
        newFeedEndTime.setHours(endHours, endMinutes, 0, 0);
      }

      const singlePayload = {
        ...basePayload,
        airDateTime: finalAirDateTime,
        feedStartTime: newFeedStartTime ? newFeedStartTime.toISOString() : undefined,
        feedEndTime: newFeedEndTime ? newFeedEndTime.toISOString() : undefined,
      };

      const payload = normalizePayload(singlePayload);
      onSubmit(payload as any, status);
    } else {
      bulkDates.forEach((date, index) => {
        const [airHours, airMinutes] = formData.airTime.split(':').map(Number);
        const newAirDateTime = new Date(date);
        newAirDateTime.setHours(airHours, airMinutes, 0, 0);

        let newFeedStartTime = undefined;
        let newFeedEndTime = undefined;

        if (formData.feedStartTimeOnly && formData.feedEndTimeOnly) {
          const [startHours, startMinutes] = formData.feedStartTimeOnly.split(':').map(Number);
          const [endHours, endMinutes] = formData.feedEndTimeOnly.split(':').map(Number);

          newFeedStartTime = new Date(date);
          newFeedStartTime.setHours(startHours, startMinutes, 0, 0);

          newFeedEndTime = new Date(date);
          newFeedEndTime.setHours(endHours, endMinutes, 0, 0);
        }

        const bulkPayload = {
          ...basePayload,
          title: generateTitleForDate(date, index),
          airDateTime: newAirDateTime.toISOString(),
          feedStartTime: newFeedStartTime ? newFeedStartTime.toISOString() : formData.feedStartTime,
          feedEndTime: newFeedEndTime ? newFeedEndTime.toISOString() : formData.feedEndTime,
        };

        const payload = normalizePayload(bulkPayload);
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
        <Label htmlFor="guestContact">Guest Contact <span className="text-red-500">*</span> </Label>
        <Input
          id="guestContact"
          value={formData.guestContact || ""}
          onChange={(e) => handleChange("guestContact", e.target.value)}
        />
        {errors.guestContact && (
          <p className="text-sm text-red-500">{errors.guestContact}</p>
        )}
      </div>
      {/* <div className="space-y-2">
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
      </div> */}
      {/* <div className="space-y-2">
        <Label htmlFor="storySlug">Story Slug</Label>
        <Input
          id="storySlug"
          value={formData.storySlug || ""}
          onChange={(e) => handleChange("storySlug", e.target.value)}
        />
      </div> */}
      {/* <div className="space-y-2">
        <Label htmlFor="rundownPosition">Rundown Position</Label>
        <Input
          id="rundownPosition"
          value={formData.rundownPosition || ""}
          onChange={(e) => handleChange("rundownPosition", e.target.value)}
        />
      </div> */}
    </>
  );

  const renderDownloadAndIngestFields = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>
          Download Links <span className="text-red-500">*</span>
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addDownloadLink}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Link
        </Button>
      </div>
      {errors.downloadLinks && (
        <p className="text-sm text-red-500">{errors.downloadLinks}</p>
      )}
      <div className="space-y-3">
        {downloadLinks.map((link, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label htmlFor={`downloadSource_${index}`}>Source</Label>
              <Select
                value={link.source}
                onValueChange={(value) => updateDownloadLink(index, 'source', value)}
              >
                <SelectTrigger
                  id={`downloadSource_${index}`}
                  className={errors[`downloadLink_${index}_source`] ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YouTube">YouTube</SelectItem>
                  <SelectItem value="WeTransfer">WeTransfer</SelectItem>
                  <SelectItem value="FTP">FTP</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors[`downloadLink_${index}_source`] && (
                <p className="text-sm text-red-500">{errors[`downloadLink_${index}_source`]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`downloadUrl_${index}`}>URL</Label>
              <Input
                id={`downloadUrl_${index}`}
                value={link.url}
                onChange={(e) => updateDownloadLink(index, 'url', e.target.value)}
                placeholder="https://..."
                className={errors[`downloadLink_${index}_url`] ? "border-red-500" : ""}
              />
              {errors[`downloadLink_${index}_url`] && (
                <p className="text-sm text-red-500">{errors[`downloadLink_${index}_url`]}</p>
              )}
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeDownloadLink(index)}
                disabled={downloadLinks.length === 1}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCameraCardFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="cameraCardVideoQuantity">
          Camera Card Video Quantity <span className="text-red-500">*</span>
        </Label>
        <Input
          id="cameraCardVideoQuantity"
          type="number"
          min="0"
          value={formData.cameraCardVideoQuantity || ""}
          onChange={(e) => handleChange("cameraCardVideoQuantity", e.target.value)}
          className={errors.cameraCardVideoQuantity ? "border-red-500" : ""}
        />
        {errors.cameraCardVideoQuantity && (
          <p className="text-sm text-red-500">{errors.cameraCardVideoQuantity}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="cameraCardAudioQuantity">
          Camera Card Audio Quantity <span className="text-red-500">*</span>
        </Label>
        <Input
          id="cameraCardAudioQuantity"
          type="number"
          min="0"
          value={formData.cameraCardAudioQuantity || ""}
          onChange={(e) => handleChange("cameraCardAudioQuantity", e.target.value)}
          className={errors.cameraCardAudioQuantity ? "border-red-500" : ""}
        />
        {errors.cameraCardAudioQuantity && (
          <p className="text-sm text-red-500">{errors.cameraCardAudioQuantity}</p>
        )}
      </div>
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
          <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Workflow Request' : 'New Workflow Request'}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEditMode ? 'Update the booking request details' : 'Create a new booking request for NOC and Ingest teams'}
          </p>
        </div>
      </div>

      {/* Booking Mode Toggle - Hidden in edit mode */}
      {!isEditMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={bookingMode === 'single' ? 'default' : 'outline'}
                onClick={() => setBookingMode('single')}
                className="w-full"
              >
                Single Booking
              </Button>
              <Button
                type="button"
                variant={bookingMode === 'bulk' ? 'default' : 'outline'}
                onClick={() => setBookingMode('bulk')}
                className="w-full"
              >
                Bulk / Series Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                    <SelectItem value="Invite Guest for News">{getBookingTypeLabel("Invite Guest for News")}</SelectItem>
                    <SelectItem value="Invite Guest for Program">{getBookingTypeLabel("Invite Guest for Program")}</SelectItem>
                    <SelectItem value="Download and Ingest">{getBookingTypeLabel("Download and Ingest")}</SelectItem>
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
              {(formData.bookingType === "Incoming Feed" ||
              formData.bookingType === "Invite Guest for News" ||
              formData.bookingType === "Invite Guest for Program") && (
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
              )}
            </div>

            {!(bookingMode === 'single' && (formData.bookingType === "Download and Ingest" || formData.bookingType === "Camera Card and Ingest")) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bookingMode === 'bulk' ? (
                  <div className="space-y-2">
                    <Label htmlFor="airTime">
                      {formData.bookingType === "Download and Ingest" ||
                      formData.bookingType === "Camera Card and Ingest"
                        ? "Ingest Time (Time of day)"
                        : "Air Time (Time of day)"}{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <TimePickerInput
                      id="airTime"
                      value={formData.airTime}
                      onChange={(value) => handleChange("airTime", value)}
                      className={errors.airTime ? "border-red-500" : ""}
                    />
                    <p className="text-xs text-muted-foreground">
                      Time will be applied to all bookings. Dates come from Bulk Booking Options.
                    </p>
                    {errors.airTime && (
                      <p className="text-sm text-red-500">{errors.airTime}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="airDate">
                        Air Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="airDate"
                        type="date"
                        value={formData.airDate}
                        onChange={(e) => handleChange("airDate", e.target.value)}
                        className={errors.airDate ? "border-red-500" : ""}
                      />
                      {errors.airDate && (
                        <p className="text-sm text-red-500">{errors.airDate}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="airTimeSingle">
                        Air Time <span className="text-red-500">*</span>
                      </Label>
                      <TimePickerInput
                        id="airTimeSingle"
                        value={formData.airTimeSingle}
                        onChange={(value) => handleChange("airTimeSingle", value)}
                        className={errors.airTimeSingle ? "border-red-500" : ""}
                      />
                      {errors.airTimeSingle && (
                        <p className="text-sm text-red-500">{errors.airTimeSingle}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {(formData.bookingType === "Incoming Feed" ||
              formData.bookingType === "Invite Guest for News" ||
              formData.bookingType === "Invite Guest for Program") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="feedStartTimeOnly">
                    Feed Start Time <span className="text-red-500">*</span>
                  </Label>
                  <TimePickerInput
                    id="feedStartTimeOnly"
                    value={formData.feedStartTimeOnly || ""}
                    onChange={(value) => handleChange("feedStartTimeOnly", value)}
                    className={errors.feedStartTimeOnly ? "border-red-500" : ""}
                  />
                  {errors.feedStartTimeOnly && (
                    <p className="text-sm text-red-500">{errors.feedStartTimeOnly}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedEndTimeOnly">
                    Feed End Time <span className="text-red-500">*</span>
                  </Label>
                  <TimePickerInput
                    id="feedEndTimeOnly"
                    value={formData.feedEndTimeOnly || ""}
                    onChange={(value) => handleChange("feedEndTimeOnly", value)}
                    className={errors.feedEndTimeOnly ? "border-red-500" : ""}
                  />
                  {errors.feedEndTimeOnly && (
                    <p className="text-sm text-red-500">{errors.feedEndTimeOnly}</p>
                  )}
                </div>
              </div>
            )}

            {!(formData.bookingType === "Incoming Feed" ||
              formData.bookingType === "Invite Guest for News" ||
              formData.bookingType === "Invite Guest for Program") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            )}
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
              {renderDownloadAndIngestFields()}
            </CardContent>
          </Card>
        )}

        {formData.bookingType === "Camera Card and Ingest" && (
          <Card>
            <CardHeader>
              <CardTitle>Camera Card Details</CardTitle>
            </CardHeader>
            <CardContent>
              {renderCameraCardFields()}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="resourcesNeeded">Resources Needed (Booking)</Label>
                <Input
                  id="resourcesNeeded"
                  value={formData.resourcesNeeded}
                  onChange={(e) => handleChange("resourcesNeeded", e.target.value)}
                />
              </div>
            </div> */}

            <div className="space-y-2">
              <Label htmlFor="notes">Comments</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 pb-0">
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>

          <Button
            type="button"
            className="w-full sm:w-auto"
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
            {isEditMode
              ? "Update Request"
              : bookingMode === 'bulk' && bulkDates.length > 1
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
