import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { RoleDto } from '../types/user';

interface AssignRolesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  username: string;
  availableRoles: RoleDto[];
  currentRoles: string[];
  onSubmit: (roles: string[]) => Promise<void>;
  loading?: boolean;
}

export const AssignRolesModal: React.FC<AssignRolesModalProps> = ({
  open,
  onOpenChange,
  userId,
  username,
  availableRoles,
  currentRoles,
  onSubmit,
  loading = false,
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    setSelectedRoles(currentRoles);
  }, [currentRoles, open]);

  const handleToggleRole = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName)
        ? prev.filter((r) => r !== roleName)
        : [...prev, roleName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(selectedRoles);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Roles</DialogTitle>
          <DialogDescription>
            Select roles for user: <strong>{username}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            {availableRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No roles available</p>
            ) : (
              <div className="space-y-3">
                {availableRoles.map((role) => {
                  const isSelected = selectedRoles.includes(role.name);
                  return (
                    <div
                      key={role.id}
                      className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={isSelected}
                        onCheckedChange={() => handleToggleRole(role.name)}
                        disabled={loading}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`role-${role.id}`}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <span className="font-medium">{role.name}</span>
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs">
                              Selected
                            </Badge>
                          )}
                        </Label>
                        {role.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Assign Roles'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
