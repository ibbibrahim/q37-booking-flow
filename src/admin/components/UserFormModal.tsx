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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserDto, CreateUserDto, UpdateUserDto } from '../types/user';

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserDto | null;
  onSubmit: (data: CreateUserDto | UpdateUserDto) => Promise<void>;
  loading?: boolean;
  /** Shown under username (e.g. API 409 conflict when creating a user) */
  serverUsernameError?: string | null;
  onClearServerUsernameError?: () => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  open,
  onOpenChange,
  user,
  onSubmit,
  loading = false,
  serverUsernameError,
  onClearServerUsernameError,
}) => {
  const isEditMode = !!user;

  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    email: '',
    extension_number: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        display_name: user.displayName || '',
        email: user.email || '',
        extension_number: user.extensionNumber || '',
        password: '',
      });
    } else {
      setFormData({
        username: '',
        display_name: '',
        email: '',
        extension_number: '',
        password: '',
      });
    }
    setErrors({});
  }, [user, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData: CreateUserDto | UpdateUserDto = {
      username: formData.username.trim(),
      display_name: formData.display_name.trim() || null,
      email: formData.email.trim() || null,
      extension_number: formData.extension_number.trim() || null,
    };

    if (!isEditMode && formData.password) {
      (submitData as CreateUserDto).password = formData.password;
    }

    await onSubmit(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit User' : 'Create New User'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update user information'
              : 'Fill in the details to create a new user'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value });
                  if (serverUsernameError) onClearServerUsernameError?.();
                }}
                disabled={loading}
                className={errors.username || serverUsernameError ? 'border-red-500' : ''}
              />
              {(errors.username || serverUsernameError) && (
                <p className="text-sm text-red-500">
                  {errors.username || serverUsernameError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="extension_number">Extension Number</Label>
              <Input
                id="extension_number"
                value={formData.extension_number}
                onChange={(e) =>
                  setFormData({ ...formData, extension_number: e.target.value })
                }
                disabled={loading}
              />
            </div>

            {!isEditMode && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                  placeholder="Leave empty for auto-generated"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Leave empty to generate a temporary password
                </p>
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
              {loading ? 'Saving...' : isEditMode ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
