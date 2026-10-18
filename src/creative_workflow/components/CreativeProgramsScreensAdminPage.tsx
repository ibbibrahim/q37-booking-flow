import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, EyeOff, ImageOff, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '../../contexts/ToastContext';
import {
  createCreativeProgram,
  createCreativeScreen,
  deleteCreativeProgram,
  deleteCreativeScreen,
  listCreativePrograms,
  listCreativeScreens,
  updateCreativeScreen,
  uploadCreativeFormFile,
} from '../services/creativeApi';
import type { CreativeScreen } from '../types/creative';

export function CreativeProgramsScreensAdminPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-card-foreground">Creative Reference Lists</h1>
      <ProgramsCard />
      <ScreensCard />
    </div>
  );
}

function ProgramsCard() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: programs = [], isLoading } = useQuery({ queryKey: ['creative-programs'], queryFn: listCreativePrograms });

  async function handleAdd() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createCreativeProgram(name.trim());
      setName('');
      queryClient.invalidateQueries({ queryKey: ['creative-programs'] });
    } catch {
      showToast('Could not add program', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCreativeProgram(id);
      queryClient.invalidateQueries({ queryKey: ['creative-programs'] });
    } catch {
      showToast('Could not remove program', 'error');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Programs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Program name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button type="button" onClick={handleAdd} disabled={submitting || !name.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="space-y-1">
            {programs.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                {p.name}
                <button onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ScreensCard() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // New screens default to Video Walls — that's where most studio screens are used.
  const [usage, setUsage] = useState<ScreenUsage>({ useForNewsHeadline: false, useForVideoWall: true });
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [uploadingNew, setUploadingNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const newImageInputRef = useRef<HTMLInputElement>(null);

  const { data: screens = [], isLoading } = useQuery({ queryKey: ['creative-screens'], queryFn: listCreativeScreens });

  async function handleNewImageSelected(file: File) {
    setUploadingNew(true);
    try {
      setNewImageUrl(await uploadCreativeFormFile(file));
    } catch {
      showToast('Image upload failed', 'error');
    } finally {
      setUploadingNew(false);
    }
  }

  async function handleAdd() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createCreativeScreen({
        name: name.trim(),
        imageUrl: newImageUrl,
        description: description.trim() || null,
        ...usage,
      });
      setName('');
      setDescription('');
      setUsage({ useForNewsHeadline: false, useForVideoWall: true });
      setNewImageUrl(null);
      queryClient.invalidateQueries({ queryKey: ['creative-screens'] });
    } catch {
      showToast('Could not add screen', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Screens</CardTitle>
        <p className="text-sm text-muted-foreground">
          Add a photo and a short location note for each studio screen, and choose which request forms offer it.
          Requesters pick screens by these cards.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={newImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleNewImageSelected(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => newImageInputRef.current?.click()}
            disabled={uploadingNew}
            title={newImageUrl ? 'Change image' : 'Add image (optional)'}
            className="relative flex h-10 w-full sm:w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border text-muted-foreground hover:bg-muted"
          >
            {uploadingNew ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : newImageUrl ? (
              <img src={newImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </button>
          <Input
            placeholder="Screen name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button type="button" onClick={handleAdd} disabled={submitting || uploadingNew || !name.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        <Input
          placeholder="Description, e.g. where it sits in the studio (optional)"
          value={description}
          maxLength={500}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Show on:</span>
          <ScreenUsageToggles value={usage} onChange={setUsage} />
        </div>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {screens.map((s) => (
              <ScreenTile key={s.id} screen={s} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScreenTile({ screen }: { screen: CreativeScreen }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState(screen.description ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-sync when the list refetches (e.g. another admin edited this screen).
  useEffect(() => {
    setDescription(screen.description ?? '');
  }, [screen.description]);

  async function save(
    patch: { imageUrl?: string | null; description?: string | null } & Partial<ScreenUsage>,
  ) {
    // The PUT is a full replace, so carry over whichever fields aren't being changed.
    await updateCreativeScreen(screen.id, {
      name: screen.name,
      imageUrl: screen.imageUrl,
      description: screen.description,
      useForNewsHeadline: screen.useForNewsHeadline,
      useForVideoWall: screen.useForVideoWall,
      ...patch,
    });
    queryClient.invalidateQueries({ queryKey: ['creative-screens'] });
  }

  async function saveImage(imageUrl: string | null) {
    await save({ imageUrl });
  }

  async function handleDescriptionBlur() {
    const next = description.trim() || null;
    if (next === (screen.description ?? null)) return;
    setBusy(true);
    try {
      await save({ description: next });
    } catch {
      showToast('Could not save description', 'error');
      setDescription(screen.description ?? '');
    } finally {
      setBusy(false);
    }
  }

  async function handleImageSelected(file: File) {
    setBusy(true);
    try {
      await saveImage(await uploadCreativeFormFile(file));
    } catch {
      showToast('Could not update screen image', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveImage() {
    setBusy(true);
    try {
      await saveImage(null);
    } catch {
      showToast('Could not remove screen image', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleUsageChange(next: ScreenUsage) {
    setBusy(true);
    try {
      await save(next);
    } catch {
      showToast('Could not update where this screen is shown', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteCreativeScreen(screen.id);
      queryClient.invalidateQueries({ queryKey: ['creative-screens'] });
    } catch {
      showToast('Could not remove screen', 'error');
      setBusy(false);
    }
  }

  return (
    <div className="group overflow-hidden rounded-lg border border-border bg-card">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageSelected(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="relative block aspect-video w-full bg-muted"
        title={screen.imageUrl ? 'Replace image' : 'Upload image'}
      >
        {screen.imageUrl ? (
          <>
            <img src={screen.imageUrl} alt={screen.name} className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              <ImagePlus className="h-4 w-4" /> Replace
            </span>
          </>
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-card-foreground">
            <ImagePlus className="h-5 w-5" />
            Upload image
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </span>
        )}
      </button>
      <div className="flex items-center justify-between gap-2 px-3 pt-2">
        <span className="truncate text-sm font-medium text-card-foreground" title={screen.name}>
          {screen.name}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {screen.imageUrl && (
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={busy}
              className="text-muted-foreground hover:text-destructive"
              title="Remove image"
            >
              <ImageOff className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="text-muted-foreground hover:text-destructive"
            title="Delete screen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="px-1.5 pb-1.5">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          disabled={busy}
          maxLength={500}
          rows={2}
          placeholder="Add a description…"
          className="min-h-0 resize-none border-transparent bg-transparent px-1.5 py-1 text-xs text-muted-foreground shadow-none hover:border-border focus-visible:border-input focus-visible:text-card-foreground"
        />
      </div>
      <div className="space-y-1.5 border-t border-border px-3 py-2.5">
        <ScreenUsageToggles
          value={{ useForNewsHeadline: screen.useForNewsHeadline, useForVideoWall: screen.useForVideoWall }}
          onChange={handleUsageChange}
          disabled={busy}
        />
        {!screen.useForNewsHeadline && !screen.useForVideoWall && (
          <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
            <EyeOff className="h-3 w-3" /> Not shown on any request form
          </p>
        )}
      </div>
    </div>
  );
}

type ScreenUsage = Pick<CreativeScreen, 'useForNewsHeadline' | 'useForVideoWall'>;

const USAGE_OPTIONS: { key: keyof ScreenUsage; label: string; title: string }[] = [
  { key: 'useForNewsHeadline', label: 'News Headline', title: 'Offered on News Headline requests' },
  {
    key: 'useForVideoWall',
    label: 'Video Walls',
    title: 'Offered on Program Video Wall and Video Wall Presentation requests',
  },
];

// Pill toggles for which request forms offer a screen.
function ScreenUsageToggles({
  value,
  onChange,
  disabled = false,
}: {
  value: ScreenUsage;
  onChange: (next: ScreenUsage) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {USAGE_OPTIONS.map((opt) => {
        const active = value[opt.key];
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={active}
            title={opt.title}
            disabled={disabled}
            onClick={() => onChange({ ...value, [opt.key]: !active })}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-60',
              active
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {active && <Check className="h-3 w-3" strokeWidth={3} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
