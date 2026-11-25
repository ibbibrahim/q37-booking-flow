import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, User, Hash, KeyRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usersApi } from '@/admin/services/usersApi';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangePassword: () => void;
}

const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();

export const ProfileModal: React.FC<ProfileModalProps> = ({
  open,
  onOpenChange,
  onChangePassword,
}) => {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    // Keyed by the session user so a different login in the same tab never sees cached details.
    queryKey: ['users', 'me', user?.id],
    queryFn: usersApi.getMe,
    enabled: open,
    staleTime: 60_000,
  });

  const profile = data ?? user;
  const username = profile?.username ?? '';
  const displayName = profile?.displayName || null;
  const email = profile?.email ?? null;
  const extensionNumber = profile?.extensionNumber ?? null;
  const roles = profile?.roles ?? [];
  const isActive = profile?.isActive ?? true;
  const showSkeleton = isLoading && !data;

  const details: { icon: React.ReactNode; label: string; value: string | null }[] = [
    { icon: <Mail size={16} />, label: 'Email', value: email },
    { icon: <Phone size={16} />, label: 'Extension', value: extensionNumber },
    { icon: <User size={16} />, label: 'Username', value: username || null },
    { icon: <Hash size={16} />, label: 'User ID', value: profile?.id != null ? String(profile.id) : null },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">My Profile</DialogTitle>
        <DialogDescription className="sr-only">
          Your account details and access roles.
        </DialogDescription>

        <div className="bg-muted/40 border-b border-border px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
              {getInitials(displayName || username) || '?'}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-lg font-semibold truncate">{displayName || username}</p>
              <p className="text-sm text-muted-foreground truncate">@{username}</p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                  isActive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {isError && (
            <p className="text-xs text-muted-foreground">Showing details from your session.</p>
          )}

          <dl className="divide-y divide-border">
            {details.map((row) => (
              <div key={row.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="text-muted-foreground">{row.icon}</span>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide">{row.label}</dt>
                  {showSkeleton ? (
                    <dd className="mt-1 h-4 w-40 animate-pulse rounded bg-muted" />
                  ) : row.value ? (
                    <dd className="text-sm font-medium truncate">{row.value}</dd>
                  ) : (
                    <dd className="text-sm text-muted-foreground">Not set</dd>
                  )}
                </div>
              </div>
            ))}
          </dl>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              Access roles <span className="text-muted-foreground font-normal">({roles.length})</span>
            </h3>
            {showSkeleton ? (
              <div className="flex flex-wrap gap-1.5">
                <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
              </div>
            ) : roles.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium"
                  >
                    {role}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not set</p>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onChangePassword}>
            <KeyRound size={16} className="mr-2" />
            Change Password
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
