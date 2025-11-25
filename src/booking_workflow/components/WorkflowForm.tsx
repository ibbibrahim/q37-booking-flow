import React, { useState } from "react";
import { Send, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  BookingType,
  WorkflowRequest,
  WorkflowStatus,
} from "../types/workflow";

interface WorkflowFormProps {
  onSubmit: (data: Partial<WorkflowRequest>, status: WorkflowStatus) => void;
  onCancel: () => void;
}

export const WorkflowForm: React.FC<WorkflowFormProps> = ({
  onSubmit,
  onCancel,
}) => {
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

      const payload = {
        ...formData,
        typeSpecificData: JSON.stringify(typeSpecific),
      };

      onSubmit(payload as any, status);
    }
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
        <div>
          <h1 className="text-2xl font-bold">New Workflow Request</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create a new booking request for NOC and Ingest teams
          </p>
        </div>
      </div>

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
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className={errors.title ? "border-red-500" : ""}
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
                    : "Air Date / Time (Local)"}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="airDateTime"
                  type="datetime-local"
                  value={formData.airDateTime}
                  onChange={(e) => handleChange("airDateTime", e.target.value)}
                  className={errors.airDateTime ? "border-red-500" : ""}
                />
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
            {formData.bookingType === "Download and Ingest" ||
            formData.bookingType === "Camera Card and Ingest"
              ? "Submit Request to Ingest"
              : "Submit Request to NOC"}
          </Button>
        </div>
      </form>
    </div>
  );
};
