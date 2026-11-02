import {
  AppWindow, Archive, AudioLines, Armchair, BadgeCheck, BadgeDollarSign, BrainCircuit, Brush,
  CalendarDays, Clapperboard, ClipboardList, Cog, Compass, Film, Globe, Handshake, Landmark, Megaphone, Mic,
  MonitorPlay, Newspaper, Palette, PenTool, RadioTower, SatelliteDish, Scissors, ScrollText, Server,
  SlidersHorizontal, Sparkles, Tv, Video, Warehouse, Wrench,
  type LucideIcon,
} from 'lucide-react';

// Values come from hr_departments.icon / hr_sections.icon (see backend AddHrDepartmentAndSectionIcons.sql).
// Adding an icon = add it here + set it in the DB.
const REGISTRY: Record<string, LucideIcon> = {
  landmark: Landmark,
  compass: Compass,
  handshake: Handshake,
  'badge-check': BadgeCheck,
  cog: Cog,
  film: Film,
  newspaper: Newspaper,
  palette: Palette,
  'sliders-horizontal': SlidersHorizontal,
  'app-window': AppWindow,
  server: Server,
  'satellite-dish': SatelliteDish,
  wrench: Wrench,
  warehouse: Warehouse,
  'monitor-play': MonitorPlay,
  video: Video,
  scissors: Scissors,
  'audio-lines': AudioLines,
  'scroll-text': ScrollText,
  'radio-tower': RadioTower,
  'pen-tool': PenTool,
  megaphone: Megaphone,
  sparkles: Sparkles,
  armchair: Armchair,
  brush: Brush,
  'brain-circuit': BrainCircuit,
  globe: Globe,
  tv: Tv,
  'clipboard-list': ClipboardList,
  mic: Mic,
  clapperboard: Clapperboard,
  'calendar-days': CalendarDays,
  archive: Archive,
  'badge-dollar-sign': BadgeDollarSign,
};

export function orgIcon(name: string | null, fallback: LucideIcon): LucideIcon {
  return (name && REGISTRY[name]) || fallback;
}
