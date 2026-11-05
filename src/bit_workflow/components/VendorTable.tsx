import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import type { BitVendor } from '../types/vendor';
import avidLogo from '@/assets/avid.png';
import evsLogo from '@/assets/evs.png';
import vizrtLogo from '@/assets/vizrt.png';

interface VendorTableProps {
  /** Vendors to show (may be a filtered subset of allVendors). */
  vendors: BitVendor[];
  /** Full ordered list — used for the # column and move bounds. */
  allVendors: BitVendor[];
  onEdit: (vendor: BitVendor) => void;
  onDelete: (vendor: BitVendor) => void;
  canMove: boolean;
  /** Index is the vendor's position in allVendors. */
  onMove: (fullIndex: number, delta: -1 | 1) => void;
}

const BRAND_LOGOS: { prefix: string; src: string; alt: string }[] = [
  { prefix: 'avid', src: avidLogo, alt: 'Avid' },
  { prefix: 'evs', src: evsLogo, alt: 'EVS' },
  { prefix: 'vizrt', src: vizrtLogo, alt: 'Vizrt' },
];

function normalizeUrl(url: string): string {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

function hostOf(url: string): string {
  try {
    return new URL(normalizeUrl(url)).host;
  } catch {
    return url;
  }
}

function monogramOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('Could not copy', 'error');
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'h-7 w-7 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground transition-opacity md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100',
        copied && 'opacity-100 md:opacity-100'
      )}
      aria-label={`Copy ${label}`}
      onClick={handleCopy}
    >
      {copied ? <Check className="text-success" /> : <Copy />}
    </Button>
  );
}

function Dash() {
  return <span className="text-muted-foreground/50">—</span>;
}

const headClass = 'h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

export function VendorTable({ vendors, allVendors, onEdit, onDelete, canMove, onMove }: VendorTableProps) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  function toggleReveal(id: number) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="overflow-x-auto">
        <Table className="min-w-[1080px] [&_th]:border-r [&_td]:border-r [&_th]:border-border/70 [&_td]:border-border/70 [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className={cn(headClass, 'w-12 text-center')}>#</TableHead>
              <TableHead className={cn(headClass, 'w-[220px]')}>Vendor</TableHead>
              <TableHead className={cn(headClass, 'w-[230px]')}>Portal</TableHead>
              <TableHead className={cn(headClass, 'w-[210px]')}>Username</TableHead>
              <TableHead className={cn(headClass, 'w-[170px]')}>Password</TableHead>
              <TableHead className={headClass}>Support</TableHead>
              <TableHead className={cn(headClass, 'w-12')}>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => {
              const fullIndex = allVendors.findIndex((v) => v.id === vendor.id);
              const lowerName = vendor.name.toLowerCase();
              const logo = BRAND_LOGOS.find((l) => lowerName.startsWith(l.prefix));
              const hasDetails =
                !!vendor.portalUrl ||
                !!vendor.username ||
                !!vendor.password ||
                !!vendor.supportEmail ||
                vendor.contacts.length > 0;
              const show = revealed.has(vendor.id);

              return (
                <TableRow key={vendor.id} className="group align-top transition-colors hover:bg-muted/30">
                  <TableCell className="py-3.5 pt-[1.15rem] text-center text-xs tabular-nums text-muted-foreground">
                    {fullIndex + 1}
                  </TableCell>

                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-3">
                      {logo ? (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white p-1">
                          <img src={logo.src} alt={logo.alt} className="h-full w-full object-contain" />
                        </div>
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                          {monogramOf(vendor.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-card-foreground">{vendor.name}</p>
                        {vendor.notes && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">{vendor.notes}</p>
                        )}
                        {!hasDetails && (
                          <button
                            type="button"
                            onClick={() => onEdit(vendor)}
                            className="text-xs text-primary hover:underline"
                          >
                            Add details
                          </button>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-3.5">
                    {vendor.portalUrl ? (
                      <div className="flex items-center gap-1">
                        <a
                          href={normalizeUrl(vendor.portalUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-[180px] items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          <span className="truncate">{hostOf(vendor.portalUrl)}</span>
                          <ExternalLink size={12} className="shrink-0" />
                        </a>
                        <CopyButton value={normalizeUrl(vendor.portalUrl)} label="portal URL" />
                      </div>
                    ) : (
                      <Dash />
                    )}
                  </TableCell>

                  <TableCell className="py-3.5">
                    {vendor.username ? (
                      <div className="flex items-center gap-1">
                        <span
                          className="max-w-[160px] truncate font-mono text-[13px] text-card-foreground"
                          title={vendor.username}
                        >
                          {vendor.username}
                        </span>
                        <CopyButton value={vendor.username} label="username" />
                      </div>
                    ) : (
                      <Dash />
                    )}
                  </TableCell>

                  <TableCell className="py-3.5">
                    {vendor.password ? (
                      <div className="flex items-center gap-1">
                        <span className="max-w-[90px] truncate font-mono text-[13px] text-card-foreground">
                          {show ? vendor.password : '••••••••'}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={show ? 'Hide password' : 'Show password'}
                          onClick={() => toggleReveal(vendor.id)}
                        >
                          {show ? <EyeOff /> : <Eye />}
                        </Button>
                        <CopyButton value={vendor.password} label="password" />
                      </div>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">Not set</span>
                    )}
                  </TableCell>

                  <TableCell className="py-3.5">
                    {vendor.supportEmail || vendor.contacts.length > 0 ? (
                      <div className="space-y-1">
                        {vendor.supportEmail && (
                          <div className="flex items-center gap-2">
                            <Mail size={12} className="shrink-0 text-muted-foreground" />
                            <a
                              href={`mailto:${vendor.supportEmail}`}
                              className="text-sm text-card-foreground hover:text-primary"
                            >
                              {vendor.supportEmail}
                            </a>
                            <CopyButton value={vendor.supportEmail} label="support email" />
                          </div>
                        )}
                        {vendor.contacts.map((c, i) => (
                          <div key={`${c.name}-${c.phone}-${i}`} className="flex items-center gap-2">
                            {c.name && <span className="text-sm font-medium text-card-foreground">{c.name}</span>}
                            {c.phone && (
                              <>
                                <a
                                  href={`tel:${c.phone.replace(/[^+\d]/g, '')}`}
                                  className="inline-flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground hover:text-primary"
                                >
                                  <Phone size={12} className="shrink-0" />
                                  {c.phone}
                                </a>
                                <CopyButton value={c.phone} label={`${c.name || 'contact'} phone`} />
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Dash />
                    )}
                  </TableCell>

                  <TableCell className="py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          aria-label="Vendor actions"
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEdit(vendor)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {canMove && (
                          <>
                            <DropdownMenuItem disabled={fullIndex <= 0} onSelect={() => onMove(fullIndex, -1)}>
                              <ArrowUp className="mr-2 h-4 w-4" />
                              Move up
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={fullIndex >= allVendors.length - 1}
                              onSelect={() => onMove(fullIndex, 1)}
                            >
                              <ArrowDown className="mr-2 h-4 w-4" />
                              Move down
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => onDelete(vendor)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
