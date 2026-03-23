import { http, HttpResponse } from 'msw';

import { API_BASE_URL } from '@/lib/utils/constants';
import {
  createNewUser,
  getAllUsers,
  getUserById,
  setUserActive,
  updateExistingUser,
  updatePassword,
} from '@/mocks/data/users';
import type { UserRole } from '@/types/roles';

const base = API_BASE_URL;

export const userHandlers = [
  // GET /v1/users - List users (admin)
  http.get(`${base}/v1/users`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Number(url.searchParams.get('limit')) || 10;
    const search = url.searchParams.get('search') || undefined;
    const role = (url.searchParams.get('role') as UserRole) || undefined;
    const isActiveParam = url.searchParams.get('isActive');
    const isActive =
      isActiveParam === null ? undefined : isActiveParam === 'true';

    const result = getAllUsers({ page, limit, search, role, isActive });
    return HttpResponse.json(result);
  }),

  // GET /v1/users/me - Get own profile (must be before /:id)
  http.get(`${base}/v1/users/me`, () => {
    // For mock purposes, return user ID 1 (admin) as the "current" user.
    const user = getUserById('1');
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  // GET /v1/users/:id - Get user by ID (admin)
  http.get(`${base}/v1/users/:id`, ({ params }) => {
    const user = getUserById(params.id as string);
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  // POST /v1/users - Create user (admin)
  http.post(`${base}/v1/users`, async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      name: string;
      role: UserRole;
      password: string;
    };

    const result = createNewUser(body);
    if ('error' in result) {
      return HttpResponse.json({ message: result.error }, { status: 400 });
    }
    return HttpResponse.json(result, { status: 201 });
  }),

  // PUT /v1/users/me/password - Change own password (must be before /:id)
  http.put(`${base}/v1/users/me/password`, async ({ request }) => {
    const body = (await request.json()) as {
      currentPassword: string;
      newPassword: string;
    };
    const result = updatePassword('1', body.currentPassword, body.newPassword);
    if (!result.success) {
      return HttpResponse.json({ message: result.error }, { status: 400 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // PUT /v1/users/me - Update own profile (must be before /:id)
  http.put(`${base}/v1/users/me`, async ({ request }) => {
    const body = (await request.json()) as { name: string; email: string };
    const user = updateExistingUser('1', body);
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  // PUT /v1/users/:id/deactivate - Deactivate user (admin)
  http.put(`${base}/v1/users/:id/deactivate`, ({ params }) => {
    const user = setUserActive(params.id as string, false);
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  // PUT /v1/users/:id/activate - Activate user (admin)
  http.put(`${base}/v1/users/:id/activate`, ({ params }) => {
    const user = setUserActive(params.id as string, true);
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  // PUT /v1/users/:id - Update user (admin)
  http.put(`${base}/v1/users/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const user = updateExistingUser(params.id as string, body);
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return HttpResponse.json(user);
  }),
];
