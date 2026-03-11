import React from 'react';
import { FileText, User, Clock, Video, AlertTriangle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getEditingStatusBadgeClass, formatDateTime } from '../utils/editingUtils';
import type { EditingRequest } from '../types/editing';

interface EditingRequestDetailProps {
  request: EditingRequest;
}

export const EditingRequestDetail: React.FC<EditingRequestDetailProps> = ({ request }) => {
  const isCancelled = request.status === 'Cancelled';
  const sessions = request.editingSessions ?? [];
  const sessionsPerWeek = request.sessionsPerWeek ?? 1;
  const hasSessions = sessions.length > 0;
  const hasLegacyAssignment =
    request.editorAssigned || request.editRoomNumber || request.availableDatetime;

  return (
    <div className="space-y-6">
      {isCancelled && request.cancellationReason && (
        <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-destructive mb-1">EDIT RESERVATION CANCELLED</h2>
              <p className="text-sm text-muted-foreground">{request.cancellationReason}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-card-foreground">Program Information</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Program Name</div>
                <div className="text-card-foreground font-medium">{request.programName}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Producer Name</div>
                <div className="text-card-foreground font-medium">{request.producerName}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Producer Contact</div>
                <div className="text-card-foreground font-medium">{request.producerContact}</div>
              </div>
              {request.producerComments && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground mb-1">Producer Comments</div>
                  <div className="text-card-foreground">{request.producerComments}</div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                <Video className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-card-foreground">Technical Details</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Rushes Selected on Cloud UX</div>
                <Badge variant="outline">{request.rushesSelectedCloudUx ? 'Yes' : 'No'}</Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Approximate Duration</div>
                <div className="text-card-foreground font-medium">{request.approximateDuration}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">GFX Ready</div>
                <Badge variant="outline">{request.gfxReady ? 'Yes' : 'No'}</Badge>
              </div>
            </div>
          </div>

          {(hasSessions || hasLegacyAssignment) && (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-base font-semibold text-card-foreground">
                  Editing Sessions ({hasSessions ? sessions.length : 1}/{sessionsPerWeek})
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {hasSessions ? (
                  sessions
                    .sort((a, b) => a.sessionNumber - b.sessionNumber)
                    .map((session) => (
                      <Card key={session.id} className="border-2">
                        <CardHeader className="pb-3">
                          <h4 className="font-medium text-sm">Session {session.sessionNumber}</h4>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-3 text-sm">
                          {session.editorAssigned && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Editor</div>
                              <div className="text-card-foreground font-medium">
                                {session.editorAssigned}
                              </div>
                            </div>
                          )}
                          {session.editRoomNumber && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Room</div>
                              <div className="text-card-foreground font-medium">
                                {session.editRoomNumber}
                              </div>
                            </div>
                          )}
                          {session.availableDatetime && (
                            <div className="col-span-2">
                              <div className="text-xs text-muted-foreground mb-1">Available Time</div>
                              <div className="text-card-foreground font-medium">
                                {formatDateTime(session.availableDatetime)}
                              </div>
                            </div>
                          )}
                          {session.editorComments && (
                            <div className="col-span-2">
                              <div className="text-xs text-muted-foreground mb-1">Comments</div>
                              <div className="text-card-foreground">{session.editorComments}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                ) : (
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <h4 className="font-medium text-sm">Session 1</h4>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 text-sm">
                      {request.editorAssigned && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Editor</div>
                          <div className="text-card-foreground font-medium">
                            {request.editorAssigned}
                          </div>
                        </div>
                      )}
                      {request.editRoomNumber && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Room</div>
                          <div className="text-card-foreground font-medium">
                            {request.editRoomNumber}
                          </div>
                        </div>
                      )}
                      {request.availableDatetime && (
                        <div className="col-span-2">
                          <div className="text-xs text-muted-foreground mb-1">Available Time</div>
                          <div className="text-card-foreground font-medium">
                            {formatDateTime(request.availableDatetime)}
                          </div>
                        </div>
                      )}
                      {request.editorComments && (
                        <div className="col-span-2">
                          <div className="text-xs text-muted-foreground mb-1">Comments</div>
                          <div className="text-card-foreground">{request.editorComments}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-card-foreground">Metadata</h2>
            </div>
            <div className="p-6 space-y-4">
              {request.createdByUser && (
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Created by</div>
                  <div className="text-sm font-medium text-card-foreground">
                    {request.createdByUser.displayName || request.createdByUser.username}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Created at</div>
                <div className="text-sm text-card-foreground">
                  {formatDateTime(request.createdAt)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Status</div>
                <Badge className={getEditingStatusBadgeClass(request.status)}>
                  {request.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
