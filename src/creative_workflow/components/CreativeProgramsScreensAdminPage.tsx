import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '../../contexts/ToastContext';
import {
  createCreativeProgram,
  createCreativeScreen,
  deleteCreativeProgram,
  deleteCreativeScreen,
  listCreativePrograms,
  listCreativeScreens,
} from '../services/creativeApi';

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
  const [submitting, setSubmitting] = useState(false);

  const { data: screens = [], isLoading } = useQuery({ queryKey: ['creative-screens'], queryFn: listCreativeScreens });

  async function handleAdd() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createCreativeScreen(name.trim());
      setName('');
      queryClient.invalidateQueries({ queryKey: ['creative-screens'] });
    } catch {
      showToast('Could not add screen', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCreativeScreen(id);
      queryClient.invalidateQueries({ queryKey: ['creative-screens'] });
    } catch {
      showToast('Could not remove screen', 'error');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Screens</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Screen name…"
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
            {screens.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                {s.name}
                <button onClick={() => handleDelete(s.id)} className="text-muted-foreground hover:text-destructive">
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
