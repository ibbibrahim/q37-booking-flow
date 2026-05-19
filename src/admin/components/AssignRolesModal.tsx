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
  userId: number; // forwarded to parent; not used internally
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
      <DialogContent className="flex flex-col w-full sm:max-w-md max-h-[90dvh] p-0 gap-0">
        {/* Fixed header */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-border">
          <DialogTitle>Assign Roles</DialogTitle>
          <DialogDescription>
            Select roles for user: <strong>{username}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable roles list */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {availableRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No roles available</p>
            ) : (
              <div className="space-y-3">
                {availableRoles.map((role) => {
                  const isSelected = selectedRoles.includes(role.name);
                  return (
                    <div
                      key={role.id}
                      onClick={() => !loading && handleToggleRole(role.name)}
                      className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                          : 'hover:bg-accent/50 border-border'
                      }`}
                    >
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={isSelected}
                        onCheckedChange={() => handleToggleRole(role.name)}
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

          {/* Fixed footer — always visible */}
          <DialogFooter className="px-6 py-4 shrink-0 border-t border-border bg-background rounded-b-lg flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              {loading ? 'Saving...' : 'Assign Roles'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
