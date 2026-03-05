export interface UserDto {
  id: number;
  username: string;
  displayName: string | null;
  email: string | null;
  extensionNumber: string | null;
  roles: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserDto {
  username: string;
  display_name?: string | null;
  email?: string | null;
  extension_number?: string | null;
  password?: string;
}

export interface UpdateUserDto {
  username: string;
  display_name?: string | null;
  email?: string | null;
  extension_number?: string | null;
}

export interface AssignRolesDto {
  roles: string[];
}

export interface ResetPasswordDto {
  newPassword?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
  temporaryPassword?: string;
}

export interface RoleDto {
  id: number;
  name: string;
  description?: string;
}

export interface UsersListParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  includeInactive?: boolean;
}

export interface UsersListResponse {
  items: UserDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
