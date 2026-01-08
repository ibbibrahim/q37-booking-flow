import apiClient from '@/utils/apiClient';
import type {
  UserDto,
  CreateUserDto,
  UpdateUserDto,
  AssignRolesDto,
  ResetPasswordDto,
  ResetPasswordResponse,
  RoleDto,
  UsersListParams,
  UsersListResponse,
} from '../types/user';

export const usersApi = {
  async getUsers(params: UsersListParams = {}): Promise<UsersListResponse> {
    const queryParams = new URLSearchParams();

    if (params.search) queryParams.append('search', params.search);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.pageSize !== undefined) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDir) queryParams.append('sortDir', params.sortDir);
    if (params.includeInactive !== undefined) queryParams.append('includeInactive', params.includeInactive.toString());

    const response = await apiClient.get<UsersListResponse>(
      `/api/users?${queryParams.toString()}`
    );
    return response.data;
  },

  async getUser(id: number): Promise<UserDto> {
    const response = await apiClient.get<UserDto>(`/api/users/${id}`);
    return response.data;
  },

  async createUser(dto: CreateUserDto): Promise<UserDto> {
    const response = await apiClient.post<UserDto>('/api/users', dto);
    return response.data;
  },

  async updateUser(id: number, dto: UpdateUserDto): Promise<UserDto> {
    const response = await apiClient.put<UserDto>(`/api/users/${id}`, dto);
    return response.data;
  },

  async deactivateUser(id: number): Promise<void> {
    await apiClient.post(`/api/users/${id}/deactivate`);
  },

  async activateUser(id: number): Promise<void> {
    await apiClient.post(`/api/users/${id}/activate`);
  },

  async getRoles(): Promise<RoleDto[]> {
    const response = await apiClient.get<RoleDto[]>('/api/roles');
    return response.data;
  },

  async getUserRoles(userId: number): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/api/users/${userId}/roles`);
    return response.data;
  },

  async assignRoles(userId: number, dto: AssignRolesDto): Promise<void> {
    await apiClient.post(`/api/users/${userId}/roles`, dto);
  },

  async resetPassword(userId: number, dto: ResetPasswordDto): Promise<ResetPasswordResponse> {
    const response = await apiClient.post<ResetPasswordResponse>(
      `/api/users/${userId}/reset-password`,
      dto
    );
    return response.data;
  },
};
