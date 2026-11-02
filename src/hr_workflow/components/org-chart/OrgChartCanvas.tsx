import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Maximize2, Minimize2, Minus, Plus, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useHrLanguage } from '../../context/HrLanguageContext';
import { OrgNodeCard, type OrgMatchState } from './OrgNodeCard';
import type { OrgNode, OrgTree } from './orgTree';

interface Props {
  tree: OrgTree;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (n: OrgNode) => void;
  matchIds: Set<string> | null;
  /** True while the unit drawer is open, so its Esc closes the drawer only, not full screen too. */
  escapeSuspended?: boolean;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 2;
const FIT_PADDING = 32;
const DRAG_THRESHOLD = 4;
const LINE = 'bg-primary/40';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface Transform { x: number; y: number; s: number }

interface DragState { id: number; startX: number; startY: number; originX: number; originY: number; active: boolean }

/** Pan/zoom for a viewport holding fixed-size content. Transforms are physical
 * px, so the same math works unchanged under dir="rtl". */
function usePanZoom(...fitKeys: unknown[]) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [tf, setTf] = useState<Transform>({ x: 0, y: 0, s: 1 });
  const drag = useRef<DragState | null>(null);
  const didDrag = useRef(false);

  const fit = useCallback(() => {
    const vp = viewportRef.current;
    const c = contentRef.current;
    if (!vp || !c) return;
    // offset* ignores CSS transforms, so this is the unscaled content size.
    const cw = c.offsetWidth;
    const ch = c.offsetHeight;
    const s = clamp(Math.min((vp.clientWidth - FIT_PADDING * 2) / cw, (vp.clientHeight - FIT_PADDING * 2) / ch, 1), MIN_SCALE, 1);
    setTf({ s, x: (vp.clientWidth - cw * s) / 2, y: Math.max(FIT_PADDING / 2, (vp.clientHeight - ch * s) / 2) });
  }, []);

  // Refit only when the tree or viewport size mode changes, not on
  // expand/collapse (that would yank the view away from what the user is
  // looking at).
  useLayoutEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, ...fitKeys]);

  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    setTf((p) => {
      const s = clamp(p.s * factor, MIN_SCALE, MAX_SCALE);
      const k = s / p.s;
      return { s, x: px - (px - p.x) * k, y: py - (py - p.y) * k };
    });
  }, []);

  const zoomCenter = useCallback((factor: number) => {
    const vp = viewportRef.current;
    if (vp) zoomAt(factor, vp.clientWidth / 2, vp.clientHeight / 2);
  }, [zoomAt]);

  // React's onWheel is passive, so preventDefault (stopping page scroll) needs a native listener.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = vp.getBoundingClientRect();
        zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - rect.left, e.clientY - rect.top);
      } else {
        setTf((p) => ({ ...p, x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const handlers = {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      didDrag.current = false;
      drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, originX: tf.x, originY: tf.y, active: false };
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      // Capture only after the threshold so plain clicks on cards still reach their buttons.
      if (!d.active) {
        if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) return;
        d.active = true;
        didDrag.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      setTf((p) => ({ ...p, x: d.originX + dx, y: d.originY + dy }));
    },
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (drag.current?.id === e.pointerId) drag.current = null;
    },
    onPointerCancel: () => {
      drag.current = null;
    },
    // A drag that ends over a button would otherwise fire a click on it.
    onClickCapture: (e: ReactMouseEvent) => {
      if (didDrag.current) {
        e.stopPropagation();
        e.preventDefault();
        didDrag.current = false;
      }
    },
  };

  return { viewportRef, contentRef, tf, fit, zoomCenter, handlers };
}

function matchStateOf(id: string, matchIds: Set<string> | null): OrgMatchState {
  if (!matchIds) return 'none';
  return matchIds.has(id) ? 'match' : 'dim';
}

function SectionList({ node, onSelect, matchIds }: { node: OrgNode; onSelect: (n: OrgNode) => void; matchIds: Set<string> | null }) {
  return (
    <ul className="flex flex-col gap-3 ps-5 pt-5">
      {node.children.map((sec, i) => (
        <li key={sec.id} className="relative">
          {/* each item draws the spine from the previous item (or the card) down to its own tick */}
          <span
            aria-hidden="true"
            className={cn('absolute -start-3 w-0.5', LINE, i === 0 ? '-top-5 h-[calc(50%+1.25rem)]' : '-top-3 h-[calc(50%+0.75rem)]')}
          />
          <span aria-hidden="true" className={cn('absolute -start-3 top-1/2 h-0.5 w-3', LINE)} />
          <OrgNodeCard node={sec} onSelect={onSelect} matchState={matchStateOf(sec.id, matchIds)} />
        </li>
      ))}
    </ul>
  );
}

function DepartmentColumn({ node, expanded, onToggle, onSelect, matchIds }: {
  node: OrgNode;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (n: OrgNode) => void;
  matchIds: Set<string> | null;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="flex w-60 flex-col">
      <OrgNodeCard node={node} expanded={expanded} onToggle={onToggle} onSelect={onSelect} matchState={matchStateOf(node.id, matchIds)} />
      <AnimatePresence initial={false}>
        {expanded && node.children.length > 0 && (
          <motion.div
            key="sections"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <SectionList node={node} onSelect={onSelect} matchIds={matchIds} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** One side of the GM stem: a branch line runs out from the stem along the top,
 * and each unit drops from it — the further from the stem, the lower it sits,
 * matching the staggered layout of the printed org chart. Columns are a fixed
 * 17rem (w-60 card + px-4), so the branch ends at the outermost column's
 * centre, 8.5rem in from the outer edge. */
function StaffSide({ units, side, column }: {
  units: OrgNode[];
  side: 'start' | 'end';
  column: (n: OrgNode) => JSX.Element;
}) {
  if (units.length === 0) return null;
  return (
    <div className={cn('relative flex items-start', side === 'start' ? 'pe-4' : 'ps-4')}>
      <span
        aria-hidden="true"
        className={cn('absolute top-0 h-0.5', LINE, side === 'start' ? 'start-[8.5rem] end-0' : 'start-0 end-[8.5rem]')}
      />
      {units.map((unit, i) => {
        const distanceFromStem = side === 'start' ? units.length - 1 - i : i;
        const drop = 2 + distanceFromStem * 4;
        return (
          <div key={unit.id} className="relative px-4" style={{ paddingTop: `${drop}rem` }}>
            <span
              aria-hidden="true"
              className={cn('absolute left-1/2 top-0 w-0.5 -translate-x-1/2', LINE)}
              style={{ height: `${drop}rem` }}
            />
            {column(unit)}
          </div>
        );
      })}
    </div>
  );
}

export function OrgChartCanvas({ tree, expanded, onToggle, onSelect, matchIds, escapeSuspended = false }: Props) {
  const { t } = useHrLanguage();
  // In-app full screen (fixed overlay) rather than the Fullscreen API: the
  // unit drawer portals to <body>, which the browser hides while another
  // element is fullscreen.
  const [fullScreen, setFullScreen] = useState(false);
  const { viewportRef, contentRef, tf, fit, zoomCenter, handlers } = usePanZoom(`${fullScreen}`, tree);

  useEffect(() => {
    if (!fullScreen || escapeSuspended) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullScreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullScreen, escapeSuspended]);
  // First half of the GM-office units sits on the start side of the stem, the rest
  // on the end side — in sort_order, so the outermost units are the first and last.
  const half = Math.ceil(tree.staffOffices.length / 2);
  const startOffices = tree.staffOffices.slice(0, half);
  const endOffices = tree.staffOffices.slice(half);
  const lines = tree.lineDepartments;

  const column = (n: OrgNode) => (
    <DepartmentColumn
      node={n}
      expanded={expanded.has(n.id)}
      onToggle={() => onToggle(n.id)}
      onSelect={onSelect}
      matchIds={matchIds}
    />
  );

  return (
    <div
      ref={viewportRef}
      {...handlers}
      className={cn(
        'cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing',
        fullScreen
          // z-50 to cover the app sidebar (also fixed z-50, earlier in the DOM);
          // the drawer's portal comes later still, so it opens on top of this.
          ? 'fixed inset-0 z-50 bg-background'
          : 'relative h-[calc(100vh-15rem)] min-h-[520px] rounded-xl border bg-muted/30',
      )}
      style={{ backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
    >
      <div
        ref={contentRef}
        className="absolute left-0 top-0 flex w-max flex-col items-center"
        style={{ transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.s})`, transformOrigin: '0 0' }}
      >
        <OrgNodeCard node={tree.root} onSelect={onSelect} />
        {/* short drop so the GM-office branch line doesn't run flush along the GM card */}
        <span aria-hidden="true" className={cn('h-8 w-0.5', LINE)} />

        {/* stem, with the units reporting directly to the GM branching off either side */}
        <div className="flex items-start">
          <StaffSide units={startOffices} side="start" column={column} />
          <span aria-hidden="true" className={cn('w-0.5 self-stretch', LINE)} />
          <StaffSide units={endOffices} side="end" column={column} />
        </div>
        <span aria-hidden="true" className={cn('h-8 w-0.5', LINE)} />

        {/* line departments: per-column half-lines join into one continuous bus */}
        <div className="flex items-start">
          {lines.map((dept, i) => (
            <div key={dept.id} className="relative px-4 pt-8">
              <span aria-hidden="true" className={cn('absolute left-1/2 top-0 h-8 w-0.5 -translate-x-1/2', LINE)} />
              {lines.length > 1 && (
                <span
                  aria-hidden="true"
                  className={cn('absolute top-0 h-0.5', LINE, i === 0 ? 'start-1/2 end-0' : i === lines.length - 1 ? 'start-0 end-1/2' : 'start-0 end-0')}
                />
              )}
              {column(dept)}
            </div>
          ))}
        </div>
      </div>

      <div
        className="absolute bottom-4 end-4 flex items-center gap-1 rounded-xl border bg-card p-1 shadow-md"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomCenter(1 / 1.2)} aria-label={t('zoomOut')} title={t('zoomOut')}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-12 text-center text-xs font-medium tabular-nums text-muted-foreground">{Math.round(tf.s * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomCenter(1.2)} aria-label={t('zoomIn')} title={t('zoomIn')}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fit} aria-label={t('fitToScreen')} title={t('fitToScreen')}>
          <Scan className="h-4 w-4" />
        </Button>
        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setFullScreen((v) => !v)}
          aria-pressed={fullScreen}
          aria-label={fullScreen ? t('exitFullScreen') : t('fullScreen')}
          title={fullScreen ? t('exitFullScreen') : t('fullScreen')}
        >
          {fullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
