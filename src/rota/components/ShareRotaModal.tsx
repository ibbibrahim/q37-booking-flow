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
import { Info } from 'lucide-react';

export interface ShareRotaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekId: number | null;
  onGenerateLink: (expiresAt?: string) => Promise<{ publicUrl: string; uuid: string }>;
  onCopySuccess?: () => void;
}

export function ShareRotaModal({
  open,
  onOpenChange,
  weekId,
  onGenerateLink,
  onCopySuccess,
}: ShareRotaModalProps) {
  const [expiryDate, setExpiryDate] = useState('');
  const [shareResult, setShareResult] = useState<{
    publicUrl: string;
    uuid: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

        {!shareResult ? (
          <div className="space-y-4">
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
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Public Link</Label>
              <div className="flex gap-2">
                <Input value={shareResult.publicUrl} readOnly className="flex-1" />
                <Button variant="outline" onClick={handleCopy}>
                  Copy
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(shareResult.publicUrl, '_blank')}
                >
                  Preview
                </Button>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Anyone with this link can view this week&apos;s rota (read-only). Rows show employees; cells show shift types (Morning, Evening, Night) or programs.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
