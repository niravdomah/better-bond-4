import { get, post, put } from '@/lib/api/client';
import type {
  ChangePasswordRequest,
  CreateUserRequest,
  UpdateProfileRequest,
  UpdateUserRequest,
  User,
  UserListParams,
  UserListResponse,
} from '@/types/user';

// Admin endpoints
export const getUsers = (params?: UserListParams) =>
  get<UserListResponse>(
    '/v1/users',
    params as Record<string, string | number | boolean | undefined>,
  );

export const getUser = (id: string) => get<User>(`/v1/users/${id}`);

export const createUser = (data: CreateUserRequest) =>
  post<User>('/v1/users', data);

export const updateUser = (id: string, data: UpdateUserRequest) =>
  put<User>(`/v1/users/${id}`, data);

export const deactivateUser = (id: string) =>
  put<User>(`/v1/users/${id}/deactivate`);

export const activateUser = (id: string) =>
  put<User>(`/v1/users/${id}/activate`);

// Profile endpoints
export const getProfile = () => get<User>('/v1/users/me');

export const updateProfile = (data: UpdateProfileRequest) =>
  put<User>('/v1/users/me', data);

export const changePassword = (data: ChangePasswordRequest) =>
  put<void>('/v1/users/me/password', data);
