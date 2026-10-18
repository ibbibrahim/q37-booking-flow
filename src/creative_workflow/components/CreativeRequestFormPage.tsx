import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Loader2, Palette, Plus, Send, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreativeDocumentUploadField } from './CreativeDocumentUploadField';
import { CreativeScreenPicker } from './CreativeScreenPicker';
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
  CREATIVE_LEAD_TIME_HOURS,
  CREATIVE_PRIORITY,
  CREATIVE_REQUEST_TYPE,
  CREATIVE_REQUEST_TYPE_LABEL,
  canCreateRequestType,
  type CreativeRequestType,
  type CreativeScreen,
  type CreativeSection,
  type FillerData,
  type FillerSection,
  type LowerThirdData,
  type LowerThirdSection,
  type NewsHeadlineData,
  type ProgramVideoWallData,
  type ProgramVideoWallTopic,
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
    platform: 'QBC',
    selectType: 'Headline',
  });
  const [newsData, setNewsData] = useState<NewsHeadlineData>({ screen: '', headlineText: '' });
  const [pvwData, setPvwData] = useState<ProgramVideoWallData>({ screen: '', topics: [] });
  const [vwpData, setVwpData] = useState<VideoWallPresentationData>({ title: '', screen: '' });
  const [fillerData, setFillerData] = useState<FillerData>({ sections: [] });
  const [lowerThirdData, setLowerThirdData] = useState<LowerThirdData>({ sections: [] });
  const [specialData, setSpecialData] = useState<SpecialRequestData>({ images: [], description: '' });

  const { data: programs = [] } = useQuery({ queryKey: ['creative-programs'], queryFn: listCreativePrograms });
  const { data: screens = [] } = useQuery({ queryKey: ['creative-screens'], queryFn: listCreativeScreens });
  // Each form only offers the screens an admin has marked for it on the Reference Lists page.
  const newsHeadlineScreens = useMemo(() => screens.filter((s) => s.useForNewsHeadline), [screens]);
  const videoWallScreens = useMemo(() => screens.filter((s) => s.useForVideoWall), [screens]);

  const leadTimeHours = CREATIVE_LEAD_TIME_HOURS[requestType];
  const leadTimeWarning = useMemo(() => {
    if (!leadTimeHours || !airDate || !airTime) return null;
    const airAt = new Date(`${airDate}T${airTime}`);
    const hoursUntil = (airAt.getTime() - Date.now()) / 3_600_000;
    if (hoursUntil < leadTimeHours) {
      return `This request type normally needs at least ${leadTimeHours} hour${leadTimeHours > 1 ? 's' : ''}' notice — Air Time is sooner than that.`;
    }
    return null;
  }, [leadTimeHours, airDate, airTime]);

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

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Request Title is required.';
    if (!airDate) next.airDate = 'Air Date is required.';
    if (!airTime) next.airTime = 'Air Time is required.';

    if (requestType === CREATIVE_REQUEST_TYPE.SocialMediaHeadline) {
      if (smData.requestKind === 'EventPackage') {
        if (!smData.eventName) next['sm.eventName'] = 'Event Name is required.';
        if (!smData.eventLogo) next['sm.eventLogo'] = 'Event Logo is required.';
      }
      if (smData.requestKind === 'DailyRequest') {
        if (smData.selectType === 'Headline' && !smData.title) next['sm.title'] = 'Headline Title is required.';
        if (smData.selectType === 'Carrousel' && (!smData.sections || smData.sections.length === 0)) {
          next['sm.sections'] = 'Add at least one section to the Carrousel.';
        }
      }
    }
    if (requestType === CREATIVE_REQUEST_TYPE.NewsHeadline) {
      if (!newsData.screen) next['news.screen'] = 'Screen is required.';
      if (!newsData.headlineText) next['news.headlineText'] = 'Headline Text is required.';
    }
    if (requestType === CREATIVE_REQUEST_TYPE.ProgramVideoWall) {
      if (!program) next['pvw.program'] = 'Program is required.';
      if (!pvwData.screen) next['pvw.screen'] = 'Screen is required.';
      if (pvwData.topics.length === 0) next['pvw.topics'] = 'Add at least one topic.';
    }
    if (requestType === CREATIVE_REQUEST_TYPE.VideoWallPresentation) {
      if (!program) next['vwp.program'] = 'Show Name is required.';
      if (!vwpData.title) next['vwp.title'] = 'Title is required.';
      if (!vwpData.screen) next['vwp.screen'] = 'Screen is required.';
    }
    if (requestType === CREATIVE_REQUEST_TYPE.Filler && fillerData.sections.length === 0) {
      next['filler.sections'] = 'Add at least one section.';
    }
    if (requestType === CREATIVE_REQUEST_TYPE.LowerThird) {
      if (!program) next['lt.program'] = 'Program is required.';
      if (lowerThirdData.sections.length === 0) next['lt.sections'] = 'Add at least one section.';
    }
    if (requestType === CREATIVE_REQUEST_TYPE.SpecialRequest && !specialData.description) {
      next['special.description'] = 'Description is required.';
    }
    return next;
  }

  async function handleSubmit() {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
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
    } catch {
      showToast('Something went wrong submitting the request. Please try again.', 'error');
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Request Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="request-title">
                Request Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="request-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="A short, useful handoff title"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
            </div>
            {/* Only one type is available to most roles (e.g. Social Media can only submit
                Social Media Headline) — showing a single-option dropdown would be pointless,
                so it's hidden and the type is set automatically in that case. */}
            {availableTypes.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="request-type">
                  Request Type <span className="text-red-500">*</span>
                </Label>
                <Select value={requestType} onValueChange={(v) => setRequestType(v as CreativeRequestType)}>
                  <SelectTrigger id="request-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {CREATIVE_REQUEST_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="priority">
                Priority <span className="text-red-500">*</span>
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CREATIVE_PRIORITY.Normal}>Normal</SelectItem>
                  <SelectItem value={CREATIVE_PRIORITY.Urgent}>Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="air-date">
                Air Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="air-date"
                type="date"
                value={airDate}
                onChange={(e) => setAirDate(e.target.value)}
                className={errors.airDate ? 'border-red-500' : ''}
              />
              {errors.airDate && <p className="text-sm text-red-500">{errors.airDate}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="air-time">
                Air Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="air-time"
                type="time"
                value={airTime}
                onChange={(e) => setAirTime(e.target.value)}
                className={errors.airTime ? 'border-red-500' : ''}
              />
              {errors.airTime && <p className="text-sm text-red-500">{errors.airTime}</p>}
            </div>
          </div>
          {leadTimeWarning && (
            <p className="text-sm text-amber-600 dark:text-amber-400">{leadTimeWarning}</p>
          )}
        </CardContent>
      </Card>

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
          screens={videoWallScreens}
          errors={errors}
        />
      )}
      {requestType === CREATIVE_REQUEST_TYPE.Filler && (
        <FillerForm data={fillerData} onChange={setFillerData} errors={errors} />
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
    </div>
  );
}

// --- Social Media Headline ---

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Social Package
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="sm-request-kind">
            Request Kind <span className="text-red-500">*</span>
          </Label>
          <Select
            value={data.requestKind}
            onValueChange={(v) => onChange({ ...data, requestKind: v as SocialMediaHeadlineData['requestKind'] })}
          >
            <SelectTrigger id="sm-request-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EventPackage">Event Package</SelectItem>
              <SelectItem value="DailyRequest">Daily Request</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data.requestKind === 'EventPackage' && (
          <div className="space-y-6 rounded-lg border border-border bg-muted/30 p-4">
            <div className="space-y-2">
              <Label>Package Request</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PACKAGE_ITEMS!.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Checkbox
                      id={`pkg-${item}`}
                      checked={(data.packageItems ?? []).includes(item)}
                      onCheckedChange={(checked) => {
                        const current = data.packageItems ?? [];
                        onChange({
                          ...data,
                          packageItems: checked ? [...current, item] : current.filter((i) => i !== item),
                        });
                      }}
                    />
                    <Label htmlFor={`pkg-${item}`} className="font-normal cursor-pointer">{item}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <CreativeDocumentUploadField
                  id="event-logo"
                  label="Event Logo"
                  required
                  value={data.eventLogo}
                  onChange={(ref) => onChange({ ...data, eventLogo: ref ?? undefined })}
                  accept="image/*"
                />
                {errors['sm.eventLogo'] && <p className="text-sm text-red-500">{errors['sm.eventLogo']}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-name">
                  Event Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="event-name"
                  value={data.eventName ?? ''}
                  onChange={(e) => onChange({ ...data, eventName: e.target.value })}
                  className={errors['sm.eventName'] ? 'border-red-500' : ''}
                />
                {errors['sm.eventName'] && <p className="text-sm text-red-500">{errors['sm.eventName']}</p>}
              </div>
            </div>
          </div>
        )}

        {data.requestKind === 'DailyRequest' && (
          <div className="space-y-6 rounded-lg border border-border bg-muted/30 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="daily-event-name">Event Name (optional)</Label>
                <Input
                  id="daily-event-name"
                  value={data.dailyEventName ?? ''}
                  onChange={(e) => onChange({ ...data, dailyEventName: e.target.value })}
                  placeholder="Event or topic name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sm-select-type">Social Subtype</Label>
                <Select
                  value={data.selectType ?? 'Headline'}
                  onValueChange={(v) => onChange({ ...data, selectType: v as SocialMediaHeadlineData['selectType'] })}
                >
                  <SelectTrigger id="sm-select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Carrousel">Carrousel</SelectItem>
                    <SelectItem value="Headline">Headline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {data.selectType === 'Carrousel' && (
              <div className="space-y-4">
                <SectionListEditor
                  sections={data.sections ?? []}
                  onChange={(sections) => onChange({ ...data, sections })}
                />
                {errors['sm.sections'] && <p className="text-sm text-red-500">{errors['sm.sections']}</p>}
                <div className="space-y-2 max-w-sm">
                  <Label htmlFor="sm-platform">Select Platform</Label>
                  <Select value={data.platform ?? 'QBC'} onValueChange={(v) => onChange({ ...data, platform: v as SocialMediaHeadlineData['platform'] })}>
                    <SelectTrigger id="sm-platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QBC">QBC</SelectItem>
                      <SelectItem value="QTV37">QTV37</SelectItem>
                      <SelectItem value="QBC & QTV37">QBC & QTV37</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {data.selectType === 'Headline' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sm-title">
                    Headline Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="sm-title"
                    value={data.title ?? ''}
                    onChange={(e) => onChange({ ...data, title: e.target.value })}
                    placeholder="Headline text"
                    className={errors['sm.title'] ? 'border-red-500' : ''}
                  />
                  {errors['sm.title'] && <p className="text-sm text-red-500">{errors['sm.title']}</p>}
                </div>
                <CreativeDocumentUploadField
                  id="sm-bg-image"
                  label="Background Image"
                  required
                  value={data.backgroundImage}
                  onChange={(ref) => onChange({ ...data, backgroundImage: ref ?? undefined })}
                  accept="image/*"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionListEditor({
  sections,
  onChange,
}: {
  sections: CreativeSection[];
  onChange: (sections: CreativeSection[]) => void;
}) {
  function updateAt(i: number, patch: Partial<(typeof sections)[number]>) {
    onChange(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function removeAt(i: number) {
    onChange(sections.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Sections</Label>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...sections, { title: '' }])}>
          <Plus className="h-4 w-4 mr-1" /> Add Section
        </Button>
      </div>
      {sections.map((s, i) => (
        <div key={i} className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Section {i + 1}</span>
            <button type="button" onClick={() => removeAt(i)} className="text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={s.title} onChange={(e) => updateAt(i, { title: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CreativeDocumentUploadField
              id={`section-bg-${i}`}
              label="Background Image"
              value={s.backgroundImage}
              onChange={(ref) => updateAt(i, { backgroundImage: ref ?? undefined })}
              accept="image/*"
            />
            <MultiFileUploadField
              id={`section-icons-${i}`}
              label="Icons"
              value={s.icons ?? []}
              onChange={(icons) => updateAt(i, { icons })}
              onUpload={uploadSingle}
              accept="image/*"
            />
          </div>
        </div>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          News Headline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label id="news-screen-label">
            Select Screen <span className="text-red-500">*</span>
          </Label>
          <CreativeScreenPicker
            id="news-screen"
            value={data.screen}
            onChange={(v) => onChange({ ...data, screen: v })}
            screens={screens}
            invalid={!!errors['news.screen']}
          />
          {errors['news.screen'] && <p className="text-sm text-red-500">{errors['news.screen']}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="news-headline-text">
            Headline Text <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="news-headline-text"
            value={data.headlineText}
            onChange={(e) => onChange({ ...data, headlineText: e.target.value })}
            rows={2}
            className={errors['news.headlineText'] ? 'border-red-500' : ''}
          />
          {errors['news.headlineText'] && <p className="text-sm text-red-500">{errors['news.headlineText']}</p>}
          <p className="text-xs text-muted-foreground">This could be the same story headline — it will not go on air.</p>
        </div>
        <div className="md:w-1/2 md:pr-3">
          <CreativeDocumentUploadField
            id="news-reference-image"
            label="Reference Image (optional)"
            value={data.referenceImage}
            onChange={(ref) => onChange({ ...data, referenceImage: ref ?? undefined })}
            accept="image/*"
          />
        </div>
      </CardContent>
    </Card>
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
  function addTopic() {
    onChange({ ...data, topics: [...data.topics, { type: 'FullScreenGraphic', text: '' }] });
  }
  function updateTopic(i: number, patch: Partial<ProgramVideoWallTopic>) {
    onChange({ ...data, topics: data.topics.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) });
  }
  function removeTopic(i: number) {
    onChange({ ...data, topics: data.topics.filter((_, idx) => idx !== i) });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Program Video Wall
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="pvw-program">
              Select Program <span className="text-red-500">*</span>
            </Label>
            <Select value={program} onValueChange={onProgramChange}>
              <SelectTrigger id="pvw-program" className={errors['pvw.program'] ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors['pvw.program'] && <p className="text-sm text-red-500">{errors['pvw.program']}</p>}
          </div>
        </div>
        <div className="space-y-3">
          <Label id="pvw-screen-label">
            Select Screen <span className="text-red-500">*</span>
          </Label>
          <CreativeScreenPicker
            id="pvw-screen"
            value={data.screen}
            onChange={(v) => onChange({ ...data, screen: v })}
            screens={screens}
            invalid={!!errors['pvw.screen']}
          />
          {errors['pvw.screen'] && <p className="text-sm text-red-500">{errors['pvw.screen']}</p>}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Topics</Label>
            <Button type="button" size="sm" variant="outline" onClick={addTopic}>
              <Plus className="h-4 w-4 mr-1" /> Add Topic
            </Button>
          </div>
          {errors['pvw.topics'] && <p className="text-sm text-red-500">{errors['pvw.topics']}</p>}
          {data.topics.map((t, i) => (
            <div key={i} className="space-y-4 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Topic {i + 1}</span>
                <button type="button" onClick={() => removeTopic(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Select value={t.type} onValueChange={(v) => updateTopic(i, { type: v as ProgramVideoWallTopic['type'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FullScreenGraphic">Full Screen Graphic</SelectItem>
                  <SelectItem value="VizTemplateGraphic">Viz Template Graphic</SelectItem>
                </SelectContent>
              </Select>
              {t.type === 'FullScreenGraphic' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Text</Label>
                    <Textarea value={t.text ?? ''} onChange={(e) => updateTopic(i, { text: e.target.value })} rows={2} />
                  </div>
                  <CreativeDocumentUploadField
                    id={`topic-image-${i}`}
                    label="Image (optional)"
                    value={t.image}
                    onChange={(ref) => updateTopic(i, { image: ref ?? undefined })}
                    accept="image/*"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <CreativeDocumentUploadField
                    id={`topic-viz-image-${i}`}
                    label="Image"
                    value={t.image}
                    onChange={(ref) => updateTopic(i, { image: ref ?? undefined })}
                    accept="image/*"
                  />
                  <div className="space-y-2">
                    <Label>Viz Template Name</Label>
                    <Input value={t.vizTemplateName ?? ''} onChange={(e) => updateTopic(i, { vizTemplateName: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Video Wall Presentation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="vwp-title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="vwp-title"
              value={data.title}
              onChange={(e) => onChange({ ...data, title: e.target.value })}
              className={errors['vwp.title'] ? 'border-red-500' : ''}
            />
            {errors['vwp.title'] && <p className="text-sm text-red-500">{errors['vwp.title']}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="vwp-show-name">
              Show Name <span className="text-red-500">*</span>
            </Label>
            <Select value={program} onValueChange={onProgramChange}>
              <SelectTrigger id="vwp-show-name" className={errors['vwp.program'] ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a show" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors['vwp.program'] && <p className="text-sm text-red-500">{errors['vwp.program']}</p>}
          </div>
        </div>
        <div className="space-y-3">
          <Label id="vwp-screen-label">
            Select Screen <span className="text-red-500">*</span>
          </Label>
          <CreativeScreenPicker
            id="vwp-screen"
            value={data.screen}
            onChange={(v) => onChange({ ...data, screen: v })}
            screens={screens}
            invalid={!!errors['vwp.screen']}
          />
          {errors['vwp.screen'] && <p className="text-sm text-red-500">{errors['vwp.screen']}</p>}
        </div>
        <p className="text-xs text-muted-foreground">This request type normally needs at least 6 hours' notice.</p>
      </CardContent>
    </Card>
  );
}

// --- Filler ---

function FillerForm({
  data,
  onChange,
  errors,
}: {
  data: FillerData;
  onChange: (d: FillerData) => void;
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Filler
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Sections</Label>
          <Button type="button" size="sm" variant="outline" onClick={addSection}>
            <Plus className="h-4 w-4 mr-1" /> Add Section
          </Button>
        </div>
        {errors['filler.sections'] && <p className="text-sm text-red-500">{errors['filler.sections']}</p>}
        {data.sections.map((s, i) => (
          <div key={i} className="space-y-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Section {i + 1}</span>
              <button type="button" onClick={() => removeAt(i)} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={s.title} onChange={(e) => updateAt(i, { title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={s.description} onChange={(e) => updateAt(i, { description: e.target.value })} rows={2} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Lower Third
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-w-sm">
          <Label htmlFor="lt-program">
            Select Program <span className="text-red-500">*</span>
          </Label>
          <Select value={program} onValueChange={onProgramChange}>
            <SelectTrigger id="lt-program" className={errors['lt.program'] ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select a program" />
            </SelectTrigger>
            <SelectContent>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors['lt.program'] && <p className="text-sm text-red-500">{errors['lt.program']}</p>}
        </div>
        <div className="flex items-center justify-between">
          <Label>Sections</Label>
          <Button type="button" size="sm" variant="outline" onClick={addSection}>
            <Plus className="h-4 w-4 mr-1" /> Add Section
          </Button>
        </div>
        {errors['lt.sections'] && <p className="text-sm text-red-500">{errors['lt.sections']}</p>}
        {data.sections.map((s, i) => (
          <div key={i} className="space-y-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Section {i + 1}</span>
              <button type="button" onClick={() => removeAt(i)} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Person Name</Label>
                <Input value={s.personName} onChange={(e) => updateAt(i, { personName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Person Job Title</Label>
                <Input value={s.personJobTitle} onChange={(e) => updateAt(i, { personJobTitle: e.target.value })} />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Special Request
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <MultiFileUploadField
          id="special-images"
          label="Image Links"
          value={data.images}
          onChange={(images) => onChange({ ...data, images })}
          onUpload={uploadSingle}
          accept="image/*"
        />
        <div className="space-y-2">
          <Label htmlFor="special-description">
            Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="special-description"
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            rows={4}
            className={errors['special.description'] ? 'border-red-500' : ''}
          />
          {errors['special.description'] && <p className="text-sm text-red-500">{errors['special.description']}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
