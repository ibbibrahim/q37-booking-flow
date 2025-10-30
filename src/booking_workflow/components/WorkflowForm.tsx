import React, { useState } from "react";
import { FormField } from "./FormField";
import { Send, FileJson, Bell, Package, Save, ArrowLeft } from "lucide-react";
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
    if (!formData.studio) {
      newErrors.studio = "Please select a studio";
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
    }

    if (formData.bookingType === "Download and Ingest") {
      if (!formData.downloadSource) {
        newErrors.downloadSource = "Please select a download source";
      }
      if (!formData.downloadLink) {
        newErrors.downloadLink = "Download link/URL is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (status: WorkflowStatus, skipValidation = false) => {
    if (skipValidation || validateForm()) {
      onSubmit(formData as any, status);
    }
  };

  const renderGuestRundownFields = () => (
    <>
      <FormField
        label="Guest Name"
        name="guestName"
        value={formData.guestName || ""}
        onChange={handleChange}
        required
        error={errors.guestName}
      />
      <FormField
        label="Guest Contact"
        name="guestContact"
        value={formData.guestContact || ""}
        onChange={handleChange}
      />
      <FormField
        label="iNEWS Rundown ID"
        name="inewsRundownId"
        value={formData.inewsRundownId || ""}
        onChange={handleChange}
        required
        error={errors.inewsRundownId}
      />
      <FormField
        label="Story Slug"
        name="storySlug"
        value={formData.storySlug || ""}
        onChange={handleChange}
      />
      <FormField
        label="Rundown Position"
        name="rundownPosition"
        value={formData.rundownPosition || ""}
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
        error={errors.downloadSource}
      />
      <FormField
        label="Download Link / URL"
        name="downloadLink"
        value={formData.downloadLink || ""}
        onChange={handleChange}
        required
        error={errors.downloadLink}
      />
    </>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-card-foreground"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />{" "}
        </button>
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">
            New Workflow Request
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create a new booking request for NOC and Ingest teams
          </p>
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-8">
          <h2 className="text-lg font-semibold text-card-foreground mb-6">
            Booking Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Booking Type"
              name="bookingType"
              value={formData.bookingType}
              onChange={handleChange}
              options={[
                "Incoming Feed",
                "Invite Guest for News",
                "Invite Guest for Program",
                "Download and Ingest",
              ]}
              required
              error={errors.bookingType}
            />
            <FormField
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              error={errors.title}
            />
          </div>

          {(formData.bookingType === "Incoming Feed" ||
            formData.bookingType === "Invite Guest for News" ||
            formData.bookingType === "Invite Guest for Program") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <FormField
                label="Studio"
                name="studio"
                value={formData.studio || ""}
                onChange={handleChange}
                options={["Studio 1", "Studio 2"]}
                required
                error={errors.studio}
              />
              <div></div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <FormField
              label="Program / Segment"
              name="program"
              value={formData.program}
              onChange={handleChange}
              placeholder="e.g., Evening News"
              required
              error={errors.program}
            />
            <FormField
              label="Air Date / Time (Local)"
              name="airDateTime"
              type="datetime-local"
              value={formData.airDateTime}
              onChange={handleChange}
              required
              error={errors.airDateTime}
            />
          </div>

          {(formData.bookingType === "Incoming Feed" ||
            formData.bookingType === "Invite Guest for News" ||
            formData.bookingType === "Invite Guest for Program") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <FormField
                label="Feed Start Time"
                name="feedStartTime"
                type="datetime-local"
                value={formData.feedStartTime || ""}
                onChange={handleChange}
                required
                error={errors.feedStartTime}
              />
              <FormField
                label="Feed End Time"
                name="feedEndTime"
                type="datetime-local"
                value={formData.feedEndTime || ""}
                onChange={handleChange}
                required
                error={errors.feedEndTime}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <FormField
              label="Language"
              name="language"
              value={formData.language}
              onChange={handleChange}
              options={["English", "Arabic"]}
              required
              error={errors.language}
            />
            <FormField
              label="Priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              options={["Normal", "High", "Urgent"]}
              required
              error={errors.priority}
            />
          </div>
        </div>

        {(formData.bookingType === "Invite Guest for News" ||
          formData.bookingType === "Invite Guest for Program") && (
          <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-card-foreground mb-6">
              Guest & Rundown Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderGuestRundownFields()}
            </div>
          </div>
        )}

        {formData.bookingType === "Download and Ingest" && (
          <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-card-foreground mb-6">
              Download Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderDownloadAndIngestFields()}
            </div>
          </div>
        )}

        <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-card-foreground mb-6">
            Additional Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* <FormField
                  label="NOC Required"
                  name="nocRequired"
                  value={formData.nocRequired}
                  onChange={handleChange}
                  options={['Yes', 'No']}
                  required
                  error={errors.nocRequired}
                /> */}
            <FormField
              label="Resources Needed (Booking)"
              name="resourcesNeeded"
              value={formData.resourcesNeeded}
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

        <div className="flex justify-end gap-3 pt-4 pb-8">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 text-card-foreground rounded-lg hover:bg-muted transition-colors font-medium border border-border"
          >
            Cancel
          </button>

          {/* <button
                type="button"
                onClick={() => handleSubmit('Draft')}
                className="flex items-center gap-2 px-6 py-2.5 bg-muted text-card-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium border border-border"
              >
                <Save size={18} />
                Save as Draft
              </button> */}
          <button
            type="button"
            onClick={() => {
              if (formData.bookingType === "Download and Ingest") {
                handleSubmit("With Ingest");
              } else {
                handleSubmit("With NOC");
              }
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Send size={18} />
            {formData.bookingType === "Download and Ingest"
              ? "Submit Request to Ingest"
              : "Submit Request to NOC"}
          </button>
        </div>
      </form>
    </div>
  );
};
