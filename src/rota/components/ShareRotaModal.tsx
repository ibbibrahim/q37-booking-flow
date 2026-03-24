import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, FileDown, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { exportRotaToPDF, exportRotaToExcel } from '../utils/exportUtils';
import type { RotaWeek, RotaDepartment, RotaEmployee, RotaShiftType } from '../types/rota';

export interface ShareRotaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekId: number | null;
  week?: RotaWeek | null;
  department?: RotaDepartment | null;
  employees?: RotaEmployee[];
  shiftTypes?: RotaShiftType[];
  onGenerateLink: (expiresAt?: string) => Promise<{ publicUrl: string; uuid: string }>;
  onCopySuccess?: () => void;
}

export function ShareRotaModal({
  open,
  onOpenChange,
  weekId,
  week,
  department,
  employees = [],
  shiftTypes = [],
  onGenerateLink,
  onCopySuccess,
}: ShareRotaModalProps) {
  const { showToast } = useToast();
  const [expiryDate, setExpiryDate] = useState('');
  const [shareResult, setShareResult] = useState<{
    publicUrl: string;
    uuid: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleGenerate = async () => {
    if (!weekId) return;
    setIsLoading(true);
    try {
      const result = await onGenerateLink(expiryDate || undefined);
      // Always use frontend origin so the link opens our employee-first PublicRotaPage
      const publicUrl = `${window.location.origin}/rota/public/${result.uuid}`;
      setShareResult({ ...result, publicUrl });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (shareResult) {
      navigator.clipboard.writeText(shareResult.publicUrl);
      onCopySuccess?.();
    }
  };

  const handlePreview = () => {
    if (shareResult) {
      window.open(shareResult.publicUrl, '_blank');
    }
  };

  const handleExportPDF = async () => {
    if (!week || !department || employees.length === 0) return;
    setIsExporting(true);
    try {
      await exportRotaToPDF(week, department, employees, shiftTypes);
      showToast('PDF exported successfully', 'success');
    } catch {
      showToast('Failed to export PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!week || !department || employees.length === 0) return;
    setIsExporting(true);
    try {
      await exportRotaToExcel(week, department, employees, shiftTypes);
      showToast('Excel exported successfully', 'success');
    } catch {
      showToast('Failed to export Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setShareResult(null);
      setExpiryDate('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Rota</DialogTitle>
          <DialogDescription>
            Generate a public link for employees to view this week&apos;s rota
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!shareResult ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="expiry">Link Expiry (Optional)</Label>
                <Input
                  id="expiry"
                  type="datetime-local"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
              <Button onClick={handleGenerate} disabled={isLoading || !weekId}>
                {isLoading ? 'Generating...' : 'Generate Link'}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Public Link</Label>
                <div className="flex gap-2">
                  <Input value={shareResult.publicUrl} readOnly className="flex-1" />
                  <Button variant="outline" onClick={handleCopy}>
                    Copy
                  </Button>
                  <Button variant="outline" onClick={handlePreview}>
                    Preview
                  </Button>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Anyone with this link can view this week&apos;s rota (read-only). Rows show employees; cells show shift types (Shift A, B, C) or programs.
                </AlertDescription>
              </Alert>
            </>
          )}

          {week && department && employees.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <Label>Export Rota</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={isExporting}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={isExporting}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
