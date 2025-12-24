import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DownloadLinkDto } from '../types/workflow';

interface UpdateDownloadLinkModalProps {
  link: DownloadLinkDto;
  isOpen: boolean;
  onClose: () => void;
  onSave: (linkId: number, ingestStatus: string, ingestNotes: string) => Promise<void>;
}

export const UpdateDownloadLinkModal: React.FC<UpdateDownloadLinkModalProps> = ({
  link,
  isOpen,
  onClose,
  onSave,
}) => {
  const [ingestStatus, setIngestStatus] = useState(link.ingestStatus || 'Pending');
  const [ingestNotes, setIngestNotes] = useState(link.ingestNotes || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(link.id, ingestStatus, ingestNotes);
      onClose();
    } catch (error) {
      console.error('Failed to update download link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Download Link Status</DialogTitle>
          <DialogDescription>
            Update the ingest status and notes for this download link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Source</Label>
            <div className="text-sm text-muted-foreground">{link.source}</div>
          </div>

          <div className="space-y-2">
            <Label>URL</Label>
            <div className="text-sm text-muted-foreground break-all">{link.url}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ingestStatus">
              Ingest Status <span className="text-red-500">*</span>
            </Label>
            <Select value={ingestStatus} onValueChange={setIngestStatus}>
              <SelectTrigger id="ingestStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In-Progress">In Progress</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ingestNotes">Ingest Notes</Label>
            <Textarea
              id="ingestNotes"
              value={ingestNotes}
              onChange={(e) => setIngestNotes(e.target.value)}
              placeholder="Add notes about the ingest process..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
