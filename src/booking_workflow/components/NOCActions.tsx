import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Send, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { WorkflowRequest } from '../types/workflow';

import { SOURCE_MAP } from '../types/workflow.ts';
import { useToast } from '@/contexts/ToastContext.tsx';


interface NOCActionsProps {
  request: WorkflowRequest;
  onAction: (action: string, data: any) => void;
}

interface AssignedResource {
  id: string;
  resourceName: string;
  type: 'Main' | 'Backup';
}

export const NOCActions: React.FC<NOCActionsProps> = ({ request, onAction }) => {
  const [nocData, setNocData] = useState({
    action: '',
    sourceType: '',
    qmcSource: '',
    resolution: '',
    resourceType: 'Main' as 'Main' | 'Backup',
    clarificationMessage: '',
    forwardToIngest: 'Yes'
  });

  const [assignedResources, setAssignedResources] = useState<AssignedResource[]>([]);
  const { showToast } = useToast();
  

  const handleAddFeedResource = () => {
    if (!nocData.sourceType) {
      showToast(`Please select Source Type`, 'error');
      return;
    }
    if (!nocData.qmcSource) {
      showToast(`Please select Source`, 'error');
      return;
    }

    const feedResourceName = `${nocData.sourceType} - ${nocData.qmcSource}${nocData.resolution ? ` (${nocData.resolution})` : ''}`;

    const isDuplicate = assignedResources.some(
      (resource) => resource.resourceName === feedResourceName && resource.type === nocData.resourceType
    );

    if (isDuplicate) {
      // alert('This resource with the same type has already been assigned');
      showToast(`This resource with the same type has already been assigned`, 'error');
      return;
    }

    const newResource: AssignedResource = {
      id: Date.now().toString(),
      resourceName: feedResourceName,
      type: nocData.resourceType
    };

    setAssignedResources([...assignedResources, newResource]);
  };

  const handleRemoveResource = (id: string) => {
    setAssignedResources(assignedResources.filter(r => r.id !== id));
  };

  const handleSaveUpdates = () => {
    onAction('save_noc_updates', {
      ...nocData,
      assignedResources,
      newStatus: 'Resources Added'
    });
  };

  const handleRequestClarification = () => {
    if (!nocData.clarificationMessage.trim()) {
      alert('Please provide a clarification message');
      
      return;
    }
    onAction('request_clarification', {
      clarificationMessage: nocData.clarificationMessage,
      newStatus: 'Clarification Requested'
    });
  };

  const handleSendToIngest = () => {
    if (assignedResources.length === 0) {
      alert('Please assign at least one resource before sending to Ingest');
      return;
    }

    onAction('send_to_ingest', {
      nocAssignedResources: JSON.stringify(assignedResources),
      changedBy: 10017,
      comment: "Resources assigned by NOC",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>NOC Actions</CardTitle>
        <Button onClick={() => onAction("acknowledge", { changedBy: 10017 })}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Acknowledge
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-6">
          <div className="space-y-4">
            {/* <h3 className="text-base font-semibold">Feed Configuration</h3> */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourceType">
                  Source Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={nocData.sourceType}
                  onValueChange={(value) => setNocData({ ...nocData, sourceType: value, qmcSource: '' })}
                >
                  <SelectTrigger id="sourceType">
                    <SelectValue placeholder="Select Source Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Earth Stations">Earth Stations</SelectItem>
                    <SelectItem value="Qatar TV">Qatar TV</SelectItem>
                    <SelectItem value="Haivision">Haivision</SelectItem>
                    <SelectItem value="Gallery">Gallery</SelectItem>
                    <SelectItem value="Streaming">Streaming</SelectItem>
                    <SelectItem value="ISO Recording">ISO Recording</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {nocData.sourceType && (
                <div className="space-y-2">
                  <Label htmlFor="qmcSource">
                    Source <span className="text-red-500">*</span>
                  </Label>

                  <Select
                    value={nocData.qmcSource}
                    onValueChange={(value) =>
                      setNocData({ ...nocData, qmcSource: value })
                    }
                  >
                    <SelectTrigger id="qmcSource">
                      <SelectValue placeholder="Select Source" />
                    </SelectTrigger>

                    <SelectContent>
                      {SOURCE_MAP[nocData.sourceType]?.map((src) => (
                        <SelectItem key={src} value={src}>
                          {src}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}


              <div className="space-y-2">
                <Label htmlFor="resolution">Resolution</Label>
                <Select
                  value={nocData.resolution}
                  onValueChange={(value) => setNocData({ ...nocData, resolution: value })}
                >
                  <SelectTrigger id="resolution">
                    <SelectValue placeholder="Select Resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HD">HD</SelectItem>
                    <SelectItem value="UHD">UHD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resourceType">Type</Label>
                <Select
                  value={nocData.resourceType}
                  onValueChange={(value) => setNocData({ ...nocData, resourceType: value as 'Main' | 'Backup' })}
                >
                  <SelectTrigger id="resourceType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Main">Main</SelectItem>
                    <SelectItem value="Backup">Backup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleAddFeedResource}
              variant="default"
              className="w-full gap-2"
            >
              <Plus size={18} />
              Add Resources
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold">Assigned Resources (NOC)</h3>

            {assignedResources.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedResources.map((resource) => (
                      <TableRow key={resource.id}>
                        <TableCell className="font-medium">
                          {resource.resourceName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={resource.type === 'Main' ? 'default' : 'secondary'}
                          >
                            {resource.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveResource(resource.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No resources assigned yet. Use the Feed Configuration above to add resources.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="clarificationMessage">
                Clarification for Booking (if needed)
              </Label>
              <Textarea
                id="clarificationMessage"
                value={nocData.clarificationMessage}
                onChange={(e) => setNocData({ ...nocData, clarificationMessage: e.target.value })}
                placeholder="e.g., Need guest confirmed number and SRT pub key"
                rows={4}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button
            onClick={handleRequestClarification}
            variant="outline"
            className=""
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Request Clarification
          </Button>
          <Button
            onClick={handleSendToIngest}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            <Send className="mr-2 h-4 w-4" />
            Send to Ingest
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
