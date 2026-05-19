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
  userId: _userId,
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
      {/* Keep DialogContent exactly as Radix expects — no flex/height overrides on the container */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Roles</DialogTitle>
          <DialogDescription>
            Select roles for user: <strong>{username}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* Only the roles list scrolls — footer stays pinned below it */}
          <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1 py-1">
            {availableRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No roles available</p>
            ) : (
              <div className="space-y-2">
                {availableRoles.map((role) => {
                  const isSelected = selectedRoles.includes(role.name);
                  return (
                    <div
                      key={role.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                          : 'border-border hover:bg-accent/40'
                      }`}
                    >
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={isSelected}
                        onCheckedChange={() => !loading && handleToggleRole(role.name)}
                        disabled={loading}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={`role-${role.id}`}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <span className="font-medium">{role.name}</span>
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              Selected
                            </Badge>
                          )}
                        </Label>
                        {role.description && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
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

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? 'Saving...' : 'Assign Roles'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
