import { useEffect, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Archive, ArrowLeft, CalendarClock, Check, ChevronDown, FileText, Loader2, Plus, Search, Send, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CreativeDocumentUploadField } from './CreativeDocumentUploadField';
import { CreativeScreenPicker } from './CreativeScreenPicker';
import {
  Field,
  FormSection,
  OptionCards,
  REQUEST_TYPE_ICON,
  RepeaterEmpty,
  RepeaterItem,
  SegmentedControl,
  TypeTiles,
  type SegmentedOption,
} from './CreativeFormParts';
import { MultiFileUploadField } from '@/components/ui/multi-file-upload-field';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  createCreativeRequest,
  listCreativePrograms,
  listCreativeScreens,
  uploadCreativeFormFile,
} from '../services/creativeApi';
import {
  IMAGE_VALIDITY_LABEL,
  type ImageValidity,
  CREATIVE_LEAD_TIME_HOURS,
  CREATIVE_PRIORITY,
  CREATIVE_REQUEST_TYPE,
  CREATIVE_REQUEST_TYPE_LABEL,
  canCreateRequestType,
  scheduleLabelsFor,
  type CreativeRequestType,
  type CreativeScreen,
  type CreativeSection,
  type FillerData,
  type FillerSection,
  type LowerThirdData,
  type LowerThirdSection,
  type NewsHeadlineData,
  type ProgramVideoWallData,
  type ProgramVideoWallSlide,
  type SocialMediaHeadlineData,
  type SpecialRequestData,
  type VideoWallPresentationData,
} from '../types/creative';

const PACKAGE_ITEMS: NonNullable<SocialMediaHeadlineData['packageItems']> = [
  'Headlines',
  'Carrousel',
  'Photo Gallery',
  'Real Templates',
];

// Any authenticated creative-module role can see which request types THEY may create via
// canCreateRequestType — SocialMedia is restricted to SocialMediaHeadline only (doc's rule).
const ALL_TYPES = Object.values(CREATIVE_REQUEST_TYPE);

async function uploadSingle(file: File): Promise<string> {
  return uploadCreativeFormFile(file);
}

// The backend returns a specific validation message on a 400, but a role check that fails
// (Forbid()) sends an empty 403 with no body — without this, that case silently fell back to
// a generic "something went wrong" with no indication it was actually a permissions problem.
function getSubmitErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
    if (err.response?.status === 403) {
      return "You don't have permission to submit this request type.";
    }
    if (err.response?.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
  }
  return 'Something went wrong submitting the request. Please try again.';
}

export function CreativeRequestFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const roles = user?.roles ?? [];

  const availableTypes = useMemo(() => ALL_TYPES.filter((t) => canCreateRequestType(roles, t)), [roles]);

  const [requestType, setRequestType] = useState<CreativeRequestType>(availableTypes[0] ?? CREATIVE_REQUEST_TYPE.SocialMediaHeadline);
  const [title, setTitle] = useState('');
  const [airDate, setAirDate] = useState('');
  const [airTime, setAirTime] = useState('');
  const [priority, setPriority] = useState<string>(CREATIVE_PRIORITY.Normal);
  const [program, setProgram] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [smData, setSmData] = useState<SocialMediaHeadlineData>({
    requestKind: 'DailyRequest',
    packageItems: [...PACKAGE_ITEMS],
    sections: [],
    selectType: 'Headline',
  });
  const [newsData, setNewsData] = useState<NewsHeadlineData>({ screen: '', headlineText: '' });
  const [pvwData, setPvwData] = useState<ProgramVideoWallData>({ screen: '', slides: [] });
  const [vwpData, setVwpData] = useState<VideoWallPresentationData>({ screen: '', slides: [] });
  const [fillerData, setFillerData] = useState<FillerData>({ sections: [] });
  const [lowerThirdData, setLowerThirdData] = useState<LowerThirdData>({ sections: [] });
  const [specialData, setSpecialData] = useState<SpecialRequestData>({ imageLinks: [], description: '' });

  const { data: programs = [] } = useQuery({ queryKey: ['creative-programs'], queryFn: listCreativePrograms });
  const { data: screens = [] } = useQuery({ queryKey: ['creative-screens'], queryFn: listCreativeScreens });
  // Each form only offers the screens an admin has marked for it on the Reference Lists page.
  const newsHeadlineScreens = useMemo(() => screens.filter((s) => s.useForNewsHeadline), [screens]);
  const videoWallScreens = useMemo(() => screens.filter((s) => s.useForVideoWall), [screens]);
  const presentationScreens = useMemo(() => screens.filter((s) => s.useForPresentation), [screens]);

  const labels = scheduleLabelsFor(requestType);
  const leadTimeHours = CREATIVE_LEAD_TIME_HOURS[requestType];
  const leadTimeWarning = useMemo(() => {
    if (!leadTimeHours || !airDate || !airTime) return null;
    const airAt = new Date(`${airDate}T${airTime}`);
    const hoursUntil = (airAt.getTime() - Date.now()) / 3_600_000;
    if (hoursUntil < leadTimeHours) {
      const label = leadTimeHours < 1 ? `${Math.round(leadTimeHours * 60)} minutes` : `${leadTimeHours} hour${leadTimeHours > 1 ? 's' : ''}`;
      return `This request type normally needs at least ${label}' notice — ${labels.time} is sooner than that.`;
    }
    return null;
  }, [leadTimeHours, airDate, airTime, labels.time]);

  function buildTypeSpecificData(): Record<string, unknown> {
    switch (requestType) {
      case CREATIVE_REQUEST_TYPE.SocialMediaHeadline:
        return smData as unknown as Record<string, unknown>;
      case CREATIVE_REQUEST_TYPE.NewsHeadline:
        return newsData as unknown as Record<string, unknown>;
      case CREATIVE_REQUEST_TYPE.ProgramVideoWall:
        return pvwData as unknown as Record<string, unknown>;
      case CREATIVE_REQUEST_TYPE.VideoWallPresentation:
        return vwpData as unknown as Record<string, unknown>;
      case CREATIVE_REQUEST_TYPE.Filler:
        return fillerData as unknown as Record<string, unknown>;
      case CREATIVE_REQUEST_TYPE.LowerThird:
        return lowerThirdData as unknown as Record<string, unknown>;
      case CREATIVE_REQUEST_TYPE.SpecialRequest:
        return specialData as unknown as Record<string, unknown>;
      default:
        return {};
    }
  }

  function isValidUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Local calendar date (not UTC) so it lines up with the <input type="date"> value being compared.
  function todayLocalDateString(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Request Title is required.';
    if (!airDate) next.airDate = `${labels.date} is required.`;
    if (!airTime) next.airTime = `${labels.time} is required.`;
    // Air Date/Time combined must be in the future. Attribute the error to whichever field
    // is actually responsible: a past date is an Air Date problem even if the time looks
    // fine in isolation; today's date with an already-passed time is an Air Time problem.
    if (airDate && airTime && new Date(`${airDate}T${airTime}`).getTime() < Date.now()) {
      if (airDate < todayLocalDateString()) {
        next.airDate = `${labels.date} must be in the future.`;
      } else {
        next.airTime = `${labels.time} must be in the future.`;
      }
    }

    if (requestType === CREATIVE_REQUEST_TYPE.SocialMediaHeadline) {
      if (smData.requestKind === 'EventPackage') {
        if (!smData.eventName) next['sm.eventName'] = 'Event Name is required.';
        if (!smData.eventLogos || smData.eventLogos.length === 0) next['sm.eventLogos'] = 'At least one Event Logo is required.';
        if (!smData.platform) next['sm.platform'] = 'Platform is required.';
      }
      if (smData.requestKind === 'DailyRequest') {
        if (smData.selectType === 'Headline' || smData.selectType === 'Reel Cover') {
          if (!smData.content) next['sm.content'] = 'Content is required.';
          if (!smData.backgroundImage) next['sm.backgroundImage'] = 'Background Image is required.';
          if (!smData.platform) next['sm.platform'] = 'Platform is required.';
        }
        if (smData.selectType === 'Carrousel') {
          const sections = smData.sections ?? [];
          if (sections.length === 0) {
            next['sm.sections'] = 'Add at least one slide to the Carrousel.';
          } else {
            sections.forEach((s, i) => {
              if (!s.content?.trim()) next[`sm.sections.${i}.content`] = 'Content is required.';
              if (!s.backgroundImage) next[`sm.sections.${i}.backgroundImage`] = 'Background Image is required.';
            });
          }
          if (!smData.platform) next['sm.platform'] = 'Platform is required.';
        }
      }
    }
    if (requestType === CREATIVE_REQUEST_TYPE.NewsHeadline) {
      if (!newsData.screen) next['news.screen'] = 'Screen is required.';
      if (!newsData.headlineText) next['news.headlineText'] = 'Headline Text is required.';
      if (!newsData.imageValidity) next['news.imageValidity'] = 'Image Validity is required.';
    }
    if (requestType === CREATIVE_REQUEST_TYPE.ProgramVideoWall) {
      if (!program) next['pvw.program'] = 'Program is required.';
      if (!pvwData.screen) next['pvw.screen'] = 'Screen is required.';
      if (!pvwData.imageValidity) next['pvw.imageValidity'] = 'Image Validity is required.';
      if (pvwData.slides.length === 0) {
        next['pvw.slides'] = 'Add at least one slide.';
      } else {
        pvwData.slides.forEach((s, i) => {
          if (!s.content?.trim()) next[`pvw.slides.${i}.content`] = 'Description is required.';
        });
      }
    }
    if (requestType === CREATIVE_REQUEST_TYPE.VideoWallPresentation) {
      if (!program) next['vwp.program'] = 'Show Name is required.';
      if (!vwpData.screen) next['vwp.screen'] = 'Screen is required.';
      if (!vwpData.imageValidity) next['vwp.imageValidity'] = 'Image Validity is required.';
      if (vwpData.slides.length === 0) {
        next['vwp.slides'] = 'Add at least one slide.';
      } else {
        vwpData.slides.forEach((s, i) => {
          if (!s.content?.trim()) next[`vwp.slides.${i}.content`] = 'Content is required.';
        });
      }
    }
    if (requestType === CREATIVE_REQUEST_TYPE.Filler) {
      if (!program) next['filler.program'] = 'Program is required.';
      if (fillerData.sections.length === 0) {
        next['filler.sections'] = 'Add at least one section.';
      } else {
        fillerData.sections.forEach((s, i) => {
          if (!s.title?.trim()) next[`filler.sections.${i}.title`] = 'Title is required.';
          if (!s.description?.trim()) next[`filler.sections.${i}.description`] = 'Description is required.';
        });
      }
    }
    if (requestType === CREATIVE_REQUEST_TYPE.LowerThird) {
      if (!program) next['lt.program'] = 'Program is required.';
      if (lowerThirdData.sections.length === 0) {
        next['lt.sections'] = 'Add at least one section.';
      } else {
        lowerThirdData.sections.forEach((s, i) => {
          if (!s.personName?.trim()) next[`lt.sections.${i}.personName`] = 'Person Name is required.';
          if (!s.personJobTitle?.trim()) next[`lt.sections.${i}.personJobTitle`] = 'Person Job Title is required.';
        });
      }
    }
    if (requestType === CREATIVE_REQUEST_TYPE.SpecialRequest) {
      if (!specialData.description) next['special.description'] = 'Description is required.';
      specialData.imageLinks.forEach((link, i) => {
        if (link.trim() && !isValidUrl(link.trim())) {
          next[`special.imageLinks.${i}`] = 'Enter a valid URL (e.g. https://...).';
        }
      });
    }
    return next;
  }

  async function handleSubmit() {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (el && el.getAttribute('aria-invalid') === 'true') el.focus({ preventScroll: true });
      });
      showToast('Please fix the highlighted fields', 'error');
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const created = await createCreativeRequest({
        requestType,
        title: title.trim(),
        airDate,
        // .NET's System.Text.Json TimeSpan converter requires HH:MM:SS; <input type="time">
        // only gives HH:MM.
        airTime: airTime.length === 5 ? `${airTime}:00` : airTime,
        priority,
        program: program || undefined,
        typeSpecificData: JSON.stringify(buildTypeSpecificData()),
      });
      showToast('Request submitted', 'success');
      navigate(`/creative-requests/${created.id}`);
    } catch (err) {
      showToast(getSubmitErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      {submitting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-8 rounded-lg shadow-lg border border-border flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-card-foreground mb-1">Submitting Request...</h3>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/creative-requests')}
            disabled={submitting}
            className="shrink-0"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-card-foreground truncate">New Creative Request</h1>
            <p className="text-muted-foreground text-sm mt-0.5 truncate">
              Submit an On-Air Graphics request to the Creative Department
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/creative-requests')} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Request
              </>
            )}
          </Button>
        </div>
      </div>

      <FormSection
        step={1}
        icon={FileText}
        title="Request"
        description="Choose what you need and give it a clear title."
      >
        {/* Only one type is available to most roles (e.g. Social Media can only submit
            Social Media Headline) — showing a single-option picker would be pointless,
            so it's hidden and the type is set automatically in that case. */}
        {availableTypes.length > 1 && (
          <Field id="request-type" label="Request Type" required bare>
            <TypeTiles
              value={requestType}
              types={availableTypes}
              labels={CREATIVE_REQUEST_TYPE_LABEL}
              onChange={setRequestType}
            />
          </Field>
        )}
        <Field id="request-title" label="Request Title" required error={errors.title}>
          <Input
            id="request-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A short, useful handoff title"
            className={errors.title ? 'border-destructive' : ''}
          />
        </Field>
      </FormSection>

      <FormSection step={2} icon={CalendarClock} title="Schedule" description="When it goes live and how urgent it is.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field id="air-date" label={labels.date} required error={errors.airDate}>
            <Input
              id="air-date"
              type="date"
              value={airDate}
              onChange={(e) => setAirDate(e.target.value)}
              className={errors.airDate ? 'border-destructive' : ''}
            />
          </Field>
          <Field id="air-time" label={labels.time} required error={errors.airTime} bare>
            <TimePicker
              id="air-time"
              value={airTime}
              onChange={setAirTime}
              label={labels.time}
              invalid={!!errors.airTime}
            />
          </Field>
          <Field id="priority" label="Priority" required bare>
            <SegmentedControl
              id="priority"
              ariaLabel="Priority"
              value={priority}
              onChange={setPriority}
              options={[
                { value: CREATIVE_PRIORITY.Normal, label: 'Normal' },
                { value: CREATIVE_PRIORITY.Urgent, label: 'Urgent', tone: 'destructive' },
              ]}
            />
          </Field>
        </div>
        {leadTimeWarning && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 text-warning shrink-0" aria-hidden="true" />
            <span>{leadTimeWarning}</span>
          </div>
        )}
      </FormSection>

      {requestType === CREATIVE_REQUEST_TYPE.SocialMediaHeadline && (
        <SocialMediaHeadlineForm data={smData} onChange={setSmData} errors={errors} />
      )}
      {requestType === CREATIVE_REQUEST_TYPE.NewsHeadline && (
        <NewsHeadlineForm data={newsData} onChange={setNewsData} screens={newsHeadlineScreens} errors={errors} />
      )}
      {requestType === CREATIVE_REQUEST_TYPE.ProgramVideoWall && (
        <ProgramVideoWallForm
          data={pvwData}
          onChange={setPvwData}
          program={program}
          onProgramChange={setProgram}
          programs={programs}
          screens={videoWallScreens}
          errors={errors}
        />
      )}
      {requestType === CREATIVE_REQUEST_TYPE.VideoWallPresentation && (
        <VideoWallPresentationForm
          data={vwpData}
          onChange={setVwpData}
          program={program}
          onProgramChange={setProgram}
          programs={programs}
          screens={presentationScreens}
          errors={errors}
        />
      )}
      {requestType === CREATIVE_REQUEST_TYPE.Filler && (
        <FillerForm
          data={fillerData}
          onChange={setFillerData}
          program={program}
          onProgramChange={setProgram}
          programs={programs}
          errors={errors}
        />
      )}
      {requestType === CREATIVE_REQUEST_TYPE.LowerThird && (
        <LowerThirdForm
          data={lowerThirdData}
          onChange={setLowerThirdData}
          program={program}
          onProgramChange={setProgram}
          programs={programs}
          errors={errors}
        />
      )}
      {requestType === CREATIVE_REQUEST_TYPE.SpecialRequest && (
        <SpecialRequestForm data={specialData} onChange={setSpecialData} errors={errors} />
      )}

      <Card>
        <CardContent className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">Fields marked * are required.</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/creative-requests')} disabled={submitting}>
              Cancel
            </Button>
            <Button size="sm" className="gap-1.5" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Shared local pieces ---

function RepeaterHeader({
  label,
  required,
  optional,
  hint,
  actionLabel,
  onAdd,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  actionLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label>
          {label}
          {required && (
            <span className="text-destructive ml-0.5" aria-hidden="true">
              *
            </span>
          )}
          {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
        </Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-1" /> {actionLabel}
      </Button>
    </div>
  );
}

function ListError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

function ProgramSelectField({
  id,
  label,
  placeholder,
  value,
  onChange,
  programs,
  error,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (p: string) => void;
  programs: { id: number; name: string }[];
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const q = search.trim().toLowerCase();
  const filtered = programs.filter((p) => !q || p.name.toLowerCase().includes(q));

  // Reset the search each time the list opens, and land on the current pick.
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setActive(Math.max(0, programs.findIndex((p) => p.name === value)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the popover opens
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function choose(name: string) {
    onChange(name);
    setOpen(false);
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = filtered[active];
      if (p) choose(p.name);
    }
  }

  return (
    <Field id={id} label={label} required error={error} bare>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            id={id}
            aria-expanded={open}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive',
              !value && 'text-muted-foreground'
            )}
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] min-w-[16rem] p-0"
          // Inside a Dialog the body scroll lock would otherwise swallow wheel/touch scrolling here.
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder="Search program…"
              aria-label="Search programs"
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <div ref={listRef} role="listbox" className="max-h-72 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">No programs match “{search.trim()}”</p>
            )}
            {filtered.map((p, index) => {
              const selected = p.name === value;
              return (
                <div
                  key={p.id}
                  role="option"
                  aria-selected={selected}
                  data-index={index}
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(p.name)}
                  className={cn(
                    'relative flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm',
                    index === active && 'bg-accent text-accent-foreground'
                  )}
                >
                  {selected && <Check className="absolute left-2 h-4 w-4" />}
                  <span className="min-w-0 truncate">{p.name}</span>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function ScreenField({
  id,
  screens,
  value,
  onChange,
  error,
}: {
  id: string;
  screens: CreativeScreen[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <Field id={id} label="Select Screen" required error={error} bare>
      <CreativeScreenPicker id={id} value={value} onChange={onChange} screens={screens} invalid={!!error} />
    </Field>
  );
}

// --- Social Media Headline ---

const SOCIAL_SUBTYPE_OPTIONS: SegmentedOption<NonNullable<SocialMediaHeadlineData['selectType']>>[] = [
  { value: 'Headline', label: 'Headline' },
  { value: 'Carrousel', label: 'Carrousel' },
  { value: 'Reel Cover', label: 'Reel Cover' },
];

function SocialMediaHeadlineForm({
  data,
  onChange,
  errors,
}: {
  data: SocialMediaHeadlineData;
  onChange: (d: SocialMediaHeadlineData) => void;
  errors: Record<string, string>;
}) {
  return (
    <FormSection
      step={3}
      icon={REQUEST_TYPE_ICON[CREATIVE_REQUEST_TYPE.SocialMediaHeadline]}
      title="Social Package"
      description="A daily post or a full event package for the social channels."
    >
      <Field id="sm-request-kind" label="Request Kind" required bare>
        <SegmentedControl
          id="sm-request-kind"
          ariaLabel="Request Kind"
          value={data.requestKind}
          onChange={(v) => onChange({ ...data, requestKind: v as SocialMediaHeadlineData['requestKind'] })}
          options={[
            { value: 'DailyRequest', label: 'Daily Request' },
            { value: 'EventPackage', label: 'Event Package' },
          ]}
        />
      </Field>

      {data.requestKind === 'EventPackage' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label id="pkg-label">Package Request</Label>
            <div role="group" aria-labelledby="pkg-label" className="flex flex-wrap gap-2">
              {PACKAGE_ITEMS!.map((item) => {
                const selected = (data.packageItems ?? []).includes(item);
                return (
                  <button
                    key={item}
                    id={`pkg-${item}`}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      const current = data.packageItems ?? [];
                      onChange({
                        ...data,
                        packageItems: selected ? current.filter((i) => i !== item) : [...current, item],
                      });
                    }}
                    className={cn(
                      'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-foreground hover:bg-muted/50',
                    )}
                  >
                    {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field id="event-name" label="Event Name" required error={errors['sm.eventName']}>
              <Input
                id="event-name"
                value={data.eventName ?? ''}
                onChange={(e) => onChange({ ...data, eventName: e.target.value })}
                className={errors['sm.eventName'] ? 'border-destructive' : ''}
              />
            </Field>
            <Field id="event-logo" error={errors['sm.eventLogos']} bare>
              <MultiFileUploadField
                id="event-logo"
                label="Event Logo(s)"
                value={data.eventLogos ?? []}
                onChange={(eventLogos) => onChange({ ...data, eventLogos })}
                onUpload={uploadSingle}
                accept="image/*"
              />
            </Field>
          </div>
          <PlatformField
            id="sm-platform-event"
            value={data.platform}
            onChange={(v) => onChange({ ...data, platform: v })}
            error={errors['sm.platform']}
          />
        </div>
      )}

      {data.requestKind === 'DailyRequest' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field id="daily-event-name" label="Event Name" optional>
              <Input
                id="daily-event-name"
                value={data.dailyEventName ?? ''}
                onChange={(e) => onChange({ ...data, dailyEventName: e.target.value })}
                placeholder="Event or topic name"
              />
            </Field>
            <Field id="sm-select-type" label="Social Subtype" bare>
              <SegmentedControl
                id="sm-select-type"
                ariaLabel="Social Subtype"
                value={data.selectType ?? 'Headline'}
                options={SOCIAL_SUBTYPE_OPTIONS}
                onChange={(v) =>
                  onChange({
                    ...data,
                    selectType: v as SocialMediaHeadlineData['selectType'],
                    // Carrousel: seed two slides so the editor opens ready to fill.
                    sections: v === 'Carrousel' && (data.sections ?? []).length === 0 ? [{ content: '' }, { content: '' }] : data.sections,
                  })
                }
              />
            </Field>
          </div>

          {data.selectType === 'Carrousel' && (
            <div className="space-y-6">
              <SectionListEditor
                sections={data.sections ?? []}
                onChange={(sections) => onChange({ ...data, sections })}
                errors={errors}
              />
              <PlatformField
                id="sm-platform-carrousel"
                value={data.platform}
                onChange={(v) => onChange({ ...data, platform: v })}
                error={errors['sm.platform']}
              />
            </div>
          )}

          {(data.selectType === 'Headline' || data.selectType === 'Reel Cover') && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field id="sm-content" label="Content" required error={errors['sm.content']}>
                  <Textarea
                    id="sm-content"
                    value={data.content ?? ''}
                    onChange={(e) => onChange({ ...data, content: e.target.value })}
                    placeholder={data.selectType === 'Reel Cover' ? 'Reel cover text' : 'Headline text'}
                    rows={4}
                    className={errors['sm.content'] ? 'border-destructive' : ''}
                  />
                </Field>
                <Field id="sm-bg-image" error={errors['sm.backgroundImage']} bare>
                  <CreativeDocumentUploadField
                    id="sm-bg-image"
                    label="Background Image"
                    required
                    value={data.backgroundImage}
                    onChange={(ref) => onChange({ ...data, backgroundImage: ref ?? undefined })}
                    accept="image/*"
                  />
                </Field>
              </div>
              <PlatformField
                id="sm-platform-headline"
                value={data.platform}
                onChange={(v) => onChange({ ...data, platform: v })}
                error={errors['sm.platform']}
              />
            </div>
          )}
        </div>
      )}
    </FormSection>
  );
}

// Platform is asked in all three Social Media Headline branches, with the same three options in each.
function PlatformField({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value?: SocialMediaHeadlineData['platform'];
  onChange: (v: NonNullable<SocialMediaHeadlineData['platform']>) => void;
  error?: string;
}) {
  return (
    <div className="border-t border-border/60 pt-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field id={id} label="Publish to" required error={error} bare>
          <SegmentedControl
            id={id}
            ariaLabel="Publish to"
            value={value}
            invalid={!!error}
            onChange={onChange}
            options={[
              { value: 'QBC', label: 'QBC' },
              { value: 'QTV37', label: 'QTV37' },
              { value: 'QBC & QTV37', label: 'QBC & QTV37' },
            ]}
          />
        </Field>
      </div>
    </div>
  );
}

const IMAGE_VALIDITY_HINT: Record<ImageValidity, string> = {
  OneMonth: 'Removed 1 month after air',
  TwoMonths: 'Removed 2 months after air',
  ThreeMonths: 'Removed 3 months after air',
  DoNotDelete: 'Kept for reuse',
};

// How long the images generated for this request stay in Vizrt's Image Library — asked on the
// three Image-Library types only. After it passes (counted from Air Date) they're listed for removal.
function ImageRetentionSection({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value?: ImageValidity;
  onChange: (v: ImageValidity) => void;
  error?: string;
}) {
  return (
    <FormSection
      step={4}
      icon={Archive}
      title="Image Library retention"
      description="How long the generated images stay in Vizrt, counted from the Air Date."
    >
      <Field id={id} label="Image Validity" required error={error} bare>
        <OptionCards<ImageValidity>
          id={id}
          ariaLabel="Image Validity"
          value={value}
          invalid={!!error}
          onChange={onChange}
          className="grid-cols-2 md:grid-cols-4"
          options={(Object.keys(IMAGE_VALIDITY_LABEL) as ImageValidity[]).map((k) => ({
            value: k,
            title: k === 'DoNotDelete' ? "Don't delete" : IMAGE_VALIDITY_LABEL[k],
            description: IMAGE_VALIDITY_HINT[k],
          }))}
        />
      </Field>
    </FormSection>
  );
}

function SectionListEditor({
  sections,
  onChange,
  errors,
}: {
  sections: CreativeSection[];
  onChange: (sections: CreativeSection[]) => void;
  errors: Record<string, string>;
}) {
  function updateAt(i: number, patch: Partial<(typeof sections)[number]>) {
    onChange(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function removeAt(i: number) {
    onChange(sections.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...sections, { content: '' }]);
  }

  return (
    <div className="space-y-3">
      <RepeaterHeader
        label="Slides"
        required
        hint="Each slide needs its own content, background image, and optional icons."
        actionLabel="Add Slide"
        onAdd={add}
      />
      <ListError id="sm-sections-error" message={errors['sm.sections']} />
      {sections.length === 0 && (
        <RepeaterEmpty text="No slides yet — start building the carrousel." actionLabel="Add Slide" onAdd={add} />
      )}
      {sections.map((s, i) => (
        <RepeaterItem key={i} index={i} title="Slide" onRemove={() => removeAt(i)}>
          <Field
            id={`section-content-${i}`}
            label="Content"
            required
            error={errors[`sm.sections.${i}.content`]}
          >
            <Textarea
              id={`section-content-${i}`}
              value={s.content}
              onChange={(e) => updateAt(i, { content: e.target.value })}
              className={errors[`sm.sections.${i}.content`] ? 'border-destructive' : ''}
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field id={`section-bg-${i}`} error={errors[`sm.sections.${i}.backgroundImage`]} bare>
              <CreativeDocumentUploadField
                id={`section-bg-${i}`}
                label="Background Image"
                required
                value={s.backgroundImage}
                onChange={(ref) => updateAt(i, { backgroundImage: ref ?? undefined })}
                accept="image/*"
              />
            </Field>
            <MultiFileUploadField
              id={`section-icons-${i}`}
              label="Icons"
              value={s.icons ?? []}
              onChange={(icons) => updateAt(i, { icons })}
              onUpload={uploadSingle}
              accept="image/*"
            />
          </div>
        </RepeaterItem>
      ))}
    </div>
  );
}

// --- News Headline ---

function NewsHeadlineForm({
  data,
  onChange,
  screens,
  errors,
}: {
  data: NewsHeadlineData;
  onChange: (d: NewsHeadlineData) => void;
  screens: CreativeScreen[];
  errors: Record<string, string>;
}) {
  return (
    <>
      <FormSection
        step={3}
        icon={REQUEST_TYPE_ICON[CREATIVE_REQUEST_TYPE.NewsHeadline]}
        title="News Headline"
        description="The on-air headline graphic and any reference material."
      >
        <ScreenField
          id="news-screen"
          value={data.screen}
          onChange={(v) => onChange({ ...data, screen: v })}
          screens={screens}
          error={errors['news.screen']}
        />
        <Field
          id="news-headline-text"
          label="Headline Text"
          required
          error={errors['news.headlineText']}
          hint="This could be the same story headline — it will not go on air."
        >
          <Textarea
            id="news-headline-text"
            value={data.headlineText}
            onChange={(e) => onChange({ ...data, headlineText: e.target.value })}
            rows={2}
            className={errors['news.headlineText'] ? 'border-destructive' : ''}
          />
        </Field>
        <div className="space-y-3">
          <Label>
            Reference assets <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <CreativeDocumentUploadField
              id="news-reference-image"
              label="Reference Image (optional)"
              value={data.referenceImage}
              onChange={(ref) => onChange({ ...data, referenceImage: ref ?? undefined })}
              accept="image/*"
            />
            <MultiFileUploadField
              id="news-logos"
              label="Logos (optional)"
              value={data.logos ?? []}
              onChange={(logos) => onChange({ ...data, logos })}
              onUpload={uploadSingle}
              accept="image/*"
            />
            <MultiFileUploadField
              id="news-flags"
              label="Flags (optional)"
              value={data.flags ?? []}
              onChange={(flags) => onChange({ ...data, flags })}
              onUpload={uploadSingle}
              accept="image/*"
            />
          </div>
        </div>
      </FormSection>
      <ImageRetentionSection
        id="news-validity"
        value={data.imageValidity}
        onChange={(v) => onChange({ ...data, imageValidity: v })}
        error={errors['news.imageValidity']}
      />
    </>
  );
}

// --- Program Video Wall ---

function ProgramVideoWallForm({
  data,
  onChange,
  program,
  onProgramChange,
  programs,
  screens,
  errors,
}: {
  data: ProgramVideoWallData;
  onChange: (d: ProgramVideoWallData) => void;
  program: string;
  onProgramChange: (p: string) => void;
  programs: { id: number; name: string }[];
  screens: CreativeScreen[];
  errors: Record<string, string>;
}) {
  function addSlide() {
    onChange({ ...data, slides: [...data.slides, { content: '' }] });
  }
  function updateSlide(i: number, patch: Partial<ProgramVideoWallSlide>) {
    onChange({ ...data, slides: data.slides.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  }
  function removeSlide(i: number) {
    onChange({ ...data, slides: data.slides.filter((_, idx) => idx !== i) });
  }

  return (
    <>
      <FormSection
        step={3}
        icon={REQUEST_TYPE_ICON[CREATIVE_REQUEST_TYPE.ProgramVideoWall]}
        title="Program Video Wall"
        description="Pick the program and screen, then describe each slide."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ProgramSelectField
            id="pvw-program"
            label="Select Program"
            placeholder="Select a program"
            value={program}
            onChange={onProgramChange}
            programs={programs}
            error={errors['pvw.program']}
          />
        </div>
        <ScreenField
          id="pvw-screen"
          value={data.screen}
          onChange={(v) => onChange({ ...data, screen: v })}
          screens={screens}
          error={errors['pvw.screen']}
        />

        <div className="space-y-3">
          <RepeaterHeader
            label="Slides"
            required
            hint="Each slide needs a description and an optional image."
            actionLabel="Add Slides"
            onAdd={addSlide}
          />
          <ListError id="pvw-slides-error" message={errors['pvw.slides']} />
          {data.slides.length === 0 && (
            <RepeaterEmpty text="No slides yet — add one to start." actionLabel="Add Slides" onAdd={addSlide} />
          )}
          {data.slides.map((s, i) => (
            <RepeaterItem key={i} index={i} title="Slide" onRemove={() => removeSlide(i)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field
                  id={`pvw-slide-content-${i}`}
                  label="Description"
                  required
                  error={errors[`pvw.slides.${i}.content`]}
                >
                  <Textarea
                    id={`pvw-slide-content-${i}`}
                    value={s.content}
                    onChange={(e) => updateSlide(i, { content: e.target.value })}
                    rows={3}
                    className={errors[`pvw.slides.${i}.content`] ? 'border-destructive' : ''}
                  />
                </Field>
                <CreativeDocumentUploadField
                  id={`slide-image-${i}`}
                  label="Image (optional)"
                  value={s.image}
                  onChange={(ref) => updateSlide(i, { image: ref ?? undefined })}
                  accept="image/*"
                />
              </div>
            </RepeaterItem>
          ))}
        </div>
      </FormSection>
      <ImageRetentionSection
        id="pvw-validity"
        value={data.imageValidity}
        onChange={(v) => onChange({ ...data, imageValidity: v })}
        error={errors['pvw.imageValidity']}
      />
    </>
  );
}

// --- Video Wall Presentation ---

function VideoWallPresentationForm({
  data,
  onChange,
  program,
  onProgramChange,
  programs,
  screens,
  errors,
}: {
  data: VideoWallPresentationData;
  onChange: (d: VideoWallPresentationData) => void;
  program: string;
  onProgramChange: (p: string) => void;
  programs: { id: number; name: string }[];
  screens: CreativeScreen[];
  errors: Record<string, string>;
}) {
  function addSlide() {
    onChange({ ...data, slides: [...data.slides, { content: '' }] });
  }
  function updateSlide(i: number, patch: Partial<ProgramVideoWallSlide>) {
    onChange({ ...data, slides: data.slides.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  }
  function removeSlide(i: number) {
    onChange({ ...data, slides: data.slides.filter((_, idx) => idx !== i) });
  }

  return (
    <>
      <FormSection
        step={3}
        icon={REQUEST_TYPE_ICON[CREATIVE_REQUEST_TYPE.VideoWallPresentation]}
        title="Presentation"
        description="Pick the show and screen, then add the content for each slide."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ProgramSelectField
            id="vwp-show-name"
            label="Show Name"
            placeholder="Select a show"
            value={program}
            onChange={onProgramChange}
            programs={programs}
            error={errors['vwp.program']}
          />
        </div>
        <ScreenField
          id="vwp-screen"
          value={data.screen}
          onChange={(v) => onChange({ ...data, screen: v })}
          screens={screens}
          error={errors['vwp.screen']}
        />

        <div className="space-y-3">
          <RepeaterHeader
            label="Slides"
            required
            hint="Each slide needs content and an optional image reference."
            actionLabel="Add Slides"
            onAdd={addSlide}
          />
          <ListError id="vwp-slides-error" message={errors['vwp.slides']} />
          {data.slides.length === 0 && (
            <RepeaterEmpty text="No slides yet — add one to start." actionLabel="Add Slides" onAdd={addSlide} />
          )}
          {data.slides.map((s, i) => (
            <RepeaterItem key={i} index={i} title="Slide" onRemove={() => removeSlide(i)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field
                  id={`vwp-slide-content-${i}`}
                  label="Content"
                  required
                  error={errors[`vwp.slides.${i}.content`]}
                >
                  <Textarea
                    id={`vwp-slide-content-${i}`}
                    value={s.content}
                    onChange={(e) => updateSlide(i, { content: e.target.value })}
                    rows={3}
                    className={errors[`vwp.slides.${i}.content`] ? 'border-destructive' : ''}
                  />
                </Field>
                <CreativeDocumentUploadField
                  id={`vwp-slide-image-${i}`}
                  label="Image Reference (optional)"
                  value={s.image}
                  onChange={(ref) => updateSlide(i, { image: ref ?? undefined })}
                  accept="image/*"
                />
              </div>
            </RepeaterItem>
          ))}
        </div>
      </FormSection>
      <ImageRetentionSection
        id="vwp-validity"
        value={data.imageValidity}
        onChange={(v) => onChange({ ...data, imageValidity: v })}
        error={errors['vwp.imageValidity']}
      />
    </>
  );
}

// --- Filler ---

function FillerForm({
  data,
  onChange,
  program,
  onProgramChange,
  programs,
  errors,
}: {
  data: FillerData;
  onChange: (d: FillerData) => void;
  program: string;
  onProgramChange: (p: string) => void;
  programs: { id: number; name: string }[];
  errors: Record<string, string>;
}) {
  function addSection() {
    onChange({ ...data, sections: [...data.sections, { title: '', description: '' }] });
  }
  function updateAt(i: number, patch: Partial<FillerSection>) {
    onChange({ ...data, sections: data.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  }
  function removeAt(i: number) {
    onChange({ ...data, sections: data.sections.filter((_, idx) => idx !== i) });
  }

  return (
    <FormSection
      step={3}
      icon={REQUEST_TYPE_ICON[CREATIVE_REQUEST_TYPE.Filler]}
      title="Filler"
      description="Pick the program, then add a section for each filler graphic."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ProgramSelectField
          id="filler-program"
          label="Select Program"
          placeholder="Select a program"
          value={program}
          onChange={onProgramChange}
          programs={programs}
          error={errors['filler.program']}
        />
      </div>
      <div className="space-y-3">
        <RepeaterHeader label="Sections" required actionLabel="Add Section" onAdd={addSection} />
        <ListError id="filler-sections-error" message={errors['filler.sections']} />
        {data.sections.length === 0 && (
          <RepeaterEmpty text="No sections yet — add one to start." actionLabel="Add Section" onAdd={addSection} />
        )}
        {data.sections.map((s, i) => (
          <RepeaterItem key={i} index={i} title="Section" onRemove={() => removeAt(i)}>
            <Field id={`filler-title-${i}`} label="Title" required error={errors[`filler.sections.${i}.title`]}>
              <Input
                id={`filler-title-${i}`}
                value={s.title}
                onChange={(e) => updateAt(i, { title: e.target.value })}
                className={errors[`filler.sections.${i}.title`] ? 'border-destructive' : ''}
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field
                id={`filler-description-${i}`}
                label="Description"
                required
                error={errors[`filler.sections.${i}.description`]}
              >
                <Textarea
                  id={`filler-description-${i}`}
                  value={s.description}
                  onChange={(e) => updateAt(i, { description: e.target.value })}
                  rows={3}
                  className={errors[`filler.sections.${i}.description`] ? 'border-destructive' : ''}
                />
              </Field>
              <CreativeDocumentUploadField
                id={`filler-image-${i}`}
                label="Image (optional)"
                value={s.image}
                onChange={(ref) => updateAt(i, { image: ref ?? undefined })}
                accept="image/*"
              />
            </div>
          </RepeaterItem>
        ))}
      </div>
      <Field id="filler-general-note" label="General Note" hint="Anything that applies to the whole request (optional)">
        <Textarea
          id="filler-general-note"
          value={data.generalNote ?? ''}
          onChange={(e) => onChange({ ...data, generalNote: e.target.value })}
          rows={3}
        />
      </Field>
    </FormSection>
  );
}

// --- Lower Third ---

function LowerThirdForm({
  data,
  onChange,
  program,
  onProgramChange,
  programs,
  errors,
}: {
  data: LowerThirdData;
  onChange: (d: LowerThirdData) => void;
  program: string;
  onProgramChange: (p: string) => void;
  programs: { id: number; name: string }[];
  errors: Record<string, string>;
}) {
  function addSection() {
    onChange({ ...data, sections: [...data.sections, { personName: '', personJobTitle: '' }] });
  }
  function updateAt(i: number, patch: Partial<LowerThirdSection>) {
    onChange({ ...data, sections: data.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  }
  function removeAt(i: number) {
    onChange({ ...data, sections: data.sections.filter((_, idx) => idx !== i) });
  }

  return (
    <FormSection
      step={3}
      icon={REQUEST_TYPE_ICON[CREATIVE_REQUEST_TYPE.LowerThird]}
      title="Lower Third"
      description="Name and title straps for the people appearing on screen."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ProgramSelectField
          id="lt-program"
          label="Select Program"
          placeholder="Select a program"
          value={program}
          onChange={onProgramChange}
          programs={programs}
          error={errors['lt.program']}
        />
      </div>
      <div className="space-y-3">
        <RepeaterHeader label="Sections" required actionLabel="Add Section" onAdd={addSection} />
        <ListError id="lt-sections-error" message={errors['lt.sections']} />
        {data.sections.length === 0 && (
          <RepeaterEmpty text="No sections yet — add one to start." actionLabel="Add Section" onAdd={addSection} />
        )}
        {data.sections.map((s, i) => (
          <RepeaterItem key={i} index={i} title="Section" onRemove={() => removeAt(i)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field
                id={`lt-person-name-${i}`}
                label="Person Name"
                required
                error={errors[`lt.sections.${i}.personName`]}
              >
                <Input
                  id={`lt-person-name-${i}`}
                  value={s.personName}
                  onChange={(e) => updateAt(i, { personName: e.target.value })}
                  className={errors[`lt.sections.${i}.personName`] ? 'border-destructive' : ''}
                />
              </Field>
              <Field
                id={`lt-person-title-${i}`}
                label="Person Job Title"
                required
                error={errors[`lt.sections.${i}.personJobTitle`]}
              >
                <Input
                  id={`lt-person-title-${i}`}
                  value={s.personJobTitle}
                  onChange={(e) => updateAt(i, { personJobTitle: e.target.value })}
                  className={errors[`lt.sections.${i}.personJobTitle`] ? 'border-destructive' : ''}
                />
              </Field>
            </div>
          </RepeaterItem>
        ))}
      </div>
    </FormSection>
  );
}

// --- Special Request ---

function SpecialRequestForm({
  data,
  onChange,
  errors,
}: {
  data: SpecialRequestData;
  onChange: (d: SpecialRequestData) => void;
  errors: Record<string, string>;
}) {
  function addLink() {
    onChange({ ...data, imageLinks: [...data.imageLinks, ''] });
  }
  return (
    <FormSection
      step={3}
      icon={REQUEST_TYPE_ICON[CREATIVE_REQUEST_TYPE.SpecialRequest]}
      title="Special Request"
      description="Describe what you need and link any reference images."
    >
      <div className="space-y-3">
        <RepeaterHeader label="Image Links" optional actionLabel="Add Image Link" onAdd={addLink} />
        {data.imageLinks.length === 0 && (
          <RepeaterEmpty text="No image links added." actionLabel="Add Image Link" onAdd={addLink} />
        )}
        {data.imageLinks.map((link, i) => {
          const error = errors[`special.imageLinks.${i}`];
          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2">
                <Input
                  id={`special-link-${i}`}
                  aria-label={`Image link ${i + 1}`}
                  value={link}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      imageLinks: data.imageLinks.map((l, idx) => (idx === i ? e.target.value : l)),
                    })
                  }
                  placeholder="https://..."
                  aria-invalid={!!error || undefined}
                  aria-describedby={error ? `special-link-${i}-error` : undefined}
                  className={error ? 'border-destructive' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove image link ${i + 1}`}
                  onClick={() => onChange({ ...data, imageLinks: data.imageLinks.filter((_, idx) => idx !== i) })}
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {error && (
                <p id={`special-link-${i}-error`} role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <Field id="special-description" label="Description" required error={errors['special.description']}>
        <Textarea
          id="special-description"
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          rows={4}
          className={errors['special.description'] ? 'border-destructive' : ''}
        />
      </Field>
    </FormSection>
  );
}
