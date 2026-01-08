import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usersApi } from '../services/usersApi';
import { UserFormModal } from './UserFormModal';
import { AssignRolesModal } from './AssignRolesModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { ConfirmActionModal } from './ConfirmActionModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  Shield,
  Key,
  UserX,
  UserCheck,
  ArrowUpDown,
  Users,
} from 'lucide-react';
import type {
  UserDto,
  CreateUserDto,
  UpdateUserDto,
  RoleDto,
  UsersListParams,
} from '../types/user';

type SortField = 'username' | 'displayName' | 'email' | 'isActive';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { toast: showToast } = useToast();

  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<SortField>('username');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [includeInactive, setIncludeInactive] = useState(false);

  const [availableRoles, setAvailableRoles] = useState<RoleDto[]>([]);

  const [userFormOpen, setUserFormOpen] = useState(false);
  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [confirmActionOpen, setConfirmActionOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);
  const [selectedUserRoles, setSelectedUserRoles] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'activate' | 'deactivate';
    user: UserDto;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params: UsersListParams = {
        search: debouncedSearch || undefined,
        page: currentPage,
        pageSize,
        sortBy,
        sortDir,
        includeInactive,
      };

      const response = await usersApi.getUsers(params);

      setUsers(response.items || []);
      setTotalUsers(response.total || 0);
      setTotalPages(response.totalPages || 0);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      showToast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, currentPage, pageSize, sortBy, sortDir, includeInactive, showToast]);

  const loadRoles = useCallback(async () => {
    try {
      const roles = await usersApi.getRoles();
      setAvailableRoles(roles);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleCreateUser = async (data: CreateUserDto) => {
    try {
      setActionLoading(true);
      await usersApi.createUser(data);
      showToast({
        title: 'Success',
        description: 'User created successfully',
      });
      setUserFormOpen(false);
      loadUsers();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      showToast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (data: UpdateUserDto) => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      await usersApi.updateUser(selectedUser.id, data);
      showToast({
        title: 'Success',
        description: 'User updated successfully',
      });
      setUserFormOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      console.error('Failed to update user:', error);
      showToast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRolesModal = async (user: UserDto) => {
    try {
      setSelectedUser(user);
      const userRoles = await usersApi.getUserRoles(user.id);
      setSelectedUserRoles(userRoles);
      setRolesModalOpen(true);
    } catch (error: any) {
      console.error('Failed to load user roles:', error);
      showToast({
        title: 'Error',
        description: 'Failed to load user roles',
        variant: 'destructive',
      });
    }
  };

  const handleAssignRoles = async (roles: string[]) => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      await usersApi.assignRoles(selectedUser.id, { roles });
      showToast({
        title: 'Success',
        description: 'Roles assigned successfully',
      });
      setRolesModalOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      console.error('Failed to assign roles:', error);
      showToast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to assign roles',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (password?: string) => {
    if (!selectedUser) return '';

    try {
      setActionLoading(true);
      const response = await usersApi.resetPassword(selectedUser.id, {
        newPassword: password,
      });

      showToast({
        title: 'Success',
        description: response.message || 'Password reset successfully',
      });

      if (!password && response.temporaryPassword) {
        return response.temporaryPassword;
      }

      setResetPasswordOpen(false);
      setSelectedUser(null);
      return undefined;
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      showToast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reset password',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateDeactivate = async () => {
    if (!confirmAction) return;

    const { type, user } = confirmAction;

    if (type === 'deactivate' && user.id === currentUser?.id) {
      showToast({
        title: 'Warning',
        description: 'You cannot deactivate your own account',
        variant: 'destructive',
      });
      setConfirmActionOpen(false);
      setConfirmAction(null);
      return;
    }

    try {
      setActionLoading(true);

      if (type === 'activate') {
        await usersApi.activateUser(user.id);
        showToast({
          title: 'Success',
          description: `User ${user.username} activated successfully`,
        });
      } else {
        await usersApi.deactivateUser(user.id);
        showToast({
          title: 'Success',
          description: `User ${user.username} deactivated successfully`,
        });
      }

      setConfirmActionOpen(false);
      setConfirmAction(null);
      loadUsers();
    } catch (error: any) {
      console.error(`Failed to ${type} user:`, error);
      showToast({
        title: 'Error',
        description: error.response?.data?.message || `Failed to ${type} user`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const canEdit = currentUser?.roles?.includes('Admin');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
            <Users className="h-6 w-6" />
            User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage system users, roles, and permissions
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setUserFormOpen(true)} className="flex items-center gap-2">
            <Plus size={18} />
            New User
          </Button>
        )}
      </div>

      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username, name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="md:col-span-3">
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 flex items-center space-x-2">
            <Switch
              id="include-inactive"
              checked={includeInactive}
              onCheckedChange={setIncludeInactive}
            />
            <Label htmlFor="include-inactive" className="text-sm cursor-pointer">
              Show inactive
            </Label>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {users.length} of {totalUsers} user{totalUsers !== 1 ? 's' : ''}
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    onClick={() => handleSort('username')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Username
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('displayName')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Display Name
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('email')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Email
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('isActive')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Status
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8">
                    <p className="text-muted-foreground">No users found</p>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.displayName || '-'}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge key={role} variant="secondary">
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">No roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="default" className="bg-green-500">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setUserFormOpen(true);
                            }}
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenRolesModal(user)}
                            title="Assign roles"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setResetPasswordOpen(true);
                            }}
                            title="Reset password"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          {user.isActive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setConfirmAction({ type: 'deactivate', user });
                                setConfirmActionOpen(true);
                              }}
                              title="Deactivate user"
                            >
                              <UserX className="h-4 w-4 text-red-500" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setConfirmAction({ type: 'activate', user });
                                setConfirmActionOpen(true);
                              }}
                              title="Activate user"
                            >
                              <UserCheck className="h-4 w-4 text-green-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <UserFormModal
        open={userFormOpen}
        onOpenChange={(open) => {
          setUserFormOpen(open);
          if (!open) setSelectedUser(null);
        }}
        user={selectedUser}
        onSubmit={selectedUser ? handleUpdateUser : handleCreateUser}
        loading={actionLoading}
      />

      {selectedUser && (
        <>
          <AssignRolesModal
            open={rolesModalOpen}
            onOpenChange={setRolesModalOpen}
            userId={selectedUser.id}
            username={selectedUser.username}
            availableRoles={availableRoles}
            currentRoles={selectedUserRoles}
            onSubmit={handleAssignRoles}
            loading={actionLoading}
          />

          <ResetPasswordModal
            open={resetPasswordOpen}
            onOpenChange={setResetPasswordOpen}
            userId={selectedUser.id}
            username={selectedUser.username}
            onSubmit={handleResetPassword}
            loading={actionLoading}
          />
        </>
      )}

      {confirmAction && (
        <ConfirmActionModal
          open={confirmActionOpen}
          onOpenChange={setConfirmActionOpen}
          title={`${confirmAction.type === 'activate' ? 'Activate' : 'Deactivate'} User`}
          description={`Are you sure you want to ${confirmAction.type} user "${confirmAction.user.username}"?`}
          confirmText={confirmAction.type === 'activate' ? 'Activate' : 'Deactivate'}
          variant={confirmAction.type === 'deactivate' ? 'destructive' : 'default'}
          onConfirm={handleActivateDeactivate}
          loading={actionLoading}
        />
      )}
    </div>
  );
};
