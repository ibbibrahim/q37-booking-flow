import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { X, Mail, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EMAIL_GROUPS, DEFAULT_CC_EMAILS } from '@/constants/emailGroups';
import { callSheetApi } from '../services/mockCallSheetApi';
import { formatQatarDateTime } from '../utils/timezone';
import type { CallSheetRequest } from '../types/callsheet';

interface CallSheetEmailModalProps {
  open: boolean;
  onClose: () => void;
  callSheet: CallSheetRequest;
  onSuccess?: () => void;
}

export const CallSheetEmailModal: React.FC<CallSheetEmailModalProps> = ({
  open,
  onClose,
  callSheet,
  onSuccess,
}) => {
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    EMAIL_GROUPS.map((g) => g.id)
  );
  const [customTo, setCustomTo] = useState('');
  const [customCc, setCustomCc] = useState(DEFAULT_CC_EMAILS.join(', '));
  const [noteHtml, setNoteHtml] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      setSelectedGroups(EMAIL_GROUPS.map((g) => g.id));
      setCustomTo('');
      setCustomCc(DEFAULT_CC_EMAILS.join(', '));
      setNoteHtml('');
      setErrors([]);
      setSending(false);
    }
  }, [open]);

  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim());
  };

  const parseEmails = (emailString: string): string[] => {
    return emailString
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
  };

  const handleSend = async () => {
    const validationErrors: string[] = [];

    const groupEmails = EMAIL_GROUPS.filter((g) =>
      selectedGroups.includes(g.id)
    ).map((g) => g.email);

    const customToEmails = parseEmails(customTo);
    for (const email of customToEmails) {
      if (!validateEmail(email)) {
        validationErrors.push(`Invalid email in To field: ${email}`);
      }
    }

    const allToEmails = [...new Set([...groupEmails, ...customToEmails])];

    if (allToEmails.length === 0) {
      validationErrors.push('At least one recipient (To) is required');
    }

    const ccEmails = parseEmails(customCc);
    for (const email of ccEmails) {
      if (!validateEmail(email)) {
        validationErrors.push(`Invalid email in CC field: ${email}`);
      }
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setSending(true);

    try {
      await callSheetApi.announceCallSheet(callSheet.id!, {
        to: allToEmails,
        cc: ccEmails,
        noteHtml: noteHtml,
      });

      alert('Email sent successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      setErrors(['Failed to send email. Please try again.']);
    } finally {
      setSending(false);
    }
  };

  const generateEmailPreview = (): string => {
    const groupEmails = EMAIL_GROUPS.filter((g) =>
      selectedGroups.includes(g.id)
    ).map((g) => g.email);
    const customToEmails = parseEmails(customTo);
    const allToEmails = [...new Set([...groupEmails, ...customToEmails])];
    const ccEmails = parseEmails(customCc);

    return `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #333; margin-bottom: 20px; font-size: 24px;">Call Sheet</h1>

          <div style="border-bottom: 2px solid #e0e0e0; margin-bottom: 20px; padding-bottom: 20px;">
            <h2 style="color: #666; font-size: 18px; margin-bottom: 15px;">Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #888; width: 150px;"><strong>Title:</strong></td>
                <td style="padding: 8px 0; color: #333;">${callSheet.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888;"><strong>Department:</strong></td>
                <td style="padding: 8px 0; color: #333;">${callSheet.department}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888;"><strong>Start Date/Time:</strong></td>
                <td style="padding: 8px 0; color: #333;">${formatQatarDateTime(callSheet.startDateTime)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888;"><strong>Return Date/Time:</strong></td>
                <td style="padding: 8px 0; color: #333;">${formatQatarDateTime(callSheet.returnDateTime)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888;"><strong>Location:</strong></td>
                <td style="padding: 8px 0; color: #333;">${callSheet.location || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888;"><strong>Focal Point:</strong></td>
                <td style="padding: 8px 0; color: #333;">${callSheet.focalPoint || 'N/A'}</td>
              </tr>
            </table>
          </div>

          ${noteHtml ? `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
              <h3 style="color: #666; font-size: 16px; margin-bottom: 10px;">Additional Notes</h3>
              <div style="color: #333; line-height: 1.6;">
                ${noteHtml}
              </div>
            </div>
          ` : ''}
        </div>

        <div style="margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 8px; font-size: 12px; color: #666;">
          <p style="margin: 5px 0;"><strong>To:</strong> ${allToEmails.join(', ')}</p>
          ${ccEmails.length > 0 ? `<p style="margin: 5px 0;"><strong>CC:</strong> ${ccEmails.join(', ')}</p>` : ''}
        </div>
      </div>
    `;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Call Sheet Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                Recipient Groups
              </Label>
              <div className="space-y-2 border border-border rounded-lg p-4 bg-muted/30">
                {EMAIL_GROUPS.map((group) => (
                  <div key={group.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={group.id}
                      checked={selectedGroups.includes(group.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedGroups([...selectedGroups, group.id]);
                        } else {
                          setSelectedGroups(
                            selectedGroups.filter((id) => id !== group.id)
                          );
                        }
                      }}
                      disabled={sending}
                    />
                    <Label
                      htmlFor={group.id}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {group.label}
                      <span className="text-muted-foreground ml-2">
                        ({group.email})
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="customTo" className="text-sm font-semibold">
                Additional To Emails
              </Label>
              <Input
                id="customTo"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                className="mt-2"
                disabled={sending}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated email addresses
              </p>
            </div>

            <div>
              <Label htmlFor="customCc" className="text-sm font-semibold">
                CC Emails
              </Label>
              <Input
                id="customCc"
                value={customCc}
                onChange={(e) => setCustomCc(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                className="mt-2"
                disabled={sending}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated email addresses
              </p>
            </div>

            <div>
              <Label className="text-sm font-semibold mb-2 block">
                Additional Note (Optional)
              </Label>
              <div className="border border-border rounded-lg overflow-hidden">
                <Editor
                  apiKey="i2gpcq7lxdbrg4kzs6ega1mgefbl5p4l8thhtinym0pn1dpo"
                  onInit={(evt, editor) => (editorRef.current = editor)}
                  value={noteHtml}
                  onEditorChange={(content) => setNoteHtml(content)}
                  disabled={sending}
                  init={{
                    height: 200,
                    menubar: false,
                    plugins: [
                      'lists',
                      'link',
                      'code',
                    ],
                    toolbar:
                      'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | link | code',
                    content_style:
                      'body { font-family: Arial, sans-serif; font-size: 14px; }',
                  }}
                />
              </div>
            </div>

            {/* <div>
              <Label className="text-sm font-semibold mb-2 block">
                Email Preview
              </Label>
              <div className="border border-border rounded-lg p-4 bg-muted/30 max-h-[400px] overflow-y-auto">
                <div
                  dangerouslySetInnerHTML={{ __html: generateEmailPreview() }}
                />
              </div>
            </div> */}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending}
              className="gap-2"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
