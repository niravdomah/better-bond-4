import { UserRole } from '@/types/roles';
import type { User, UserListParams } from '@/types/user';

const now = new Date().toISOString();

let users: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: '2',
    email: 'power@example.com',
    name: 'Power User',
    role: UserRole.POWER_USER,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: '3',
    email: 'user@example.com',
    name: 'Standard User',
    role: UserRole.STANDARD_USER,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: '4',
    email: 'readonly@example.com',
    name: 'Read-Only User',
    role: UserRole.READ_ONLY,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
];

// Password store (separate from user data for security)
const passwords: Record<string, string> = {
  '1': 'Admin123!',
  '2': 'Power123!',
  '3': 'User123!',
  '4': 'Reader123!',
};

let nextId = 5;

export function getAllUsers(params?: UserListParams) {
  let filtered = [...users];

  if (params?.search) {
    const search = params.search.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search),
    );
  }

  if (params?.role) {
    filtered = filtered.filter((u) => u.role === params.role);
  }

  if (params?.isActive !== undefined) {
    filtered = filtered.filter((u) => u.isActive === params.isActive);
  }

  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  return {
    users: paged,
    total: filtered.length,
    page,
    limit,
  };
}

export function getUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export function createNewUser(data: {
  email: string;
  name: string;
  role: UserRole;
  password: string;
}): User | { error: string } {
  if (users.some((u) => u.email === data.email)) {
    return { error: 'Email already in use' };
  }

  const id = String(nextId++);
  const timestamp = new Date().toISOString();
  const user: User = {
    id,
    email: data.email,
    name: data.name,
    role: data.role,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  users.push(user);
  passwords[id] = data.password;
  return user;
}

export function updateExistingUser(
  id: string,
  data: { email?: string; name?: string; role?: UserRole; isActive?: boolean },
): User | undefined {
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return undefined;

  if (data.email && data.email !== users[index].email) {
    if (users.some((u) => u.email === data.email && u.id !== id)) {
      return undefined;
    }
  }

  users[index] = {
    ...users[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  return users[index];
}

export function setUserActive(id: string, active: boolean): User | undefined {
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return undefined;

  users[index] = {
    ...users[index],
    isActive: active,
    updatedAt: new Date().toISOString(),
  };

  return users[index];
}

export function updatePassword(
  id: string,
  currentPassword: string,
  newPassword: string,
): { success: boolean; error?: string } {
  if (!passwords[id]) {
    return { success: false, error: 'User not found' };
  }

  if (passwords[id] !== currentPassword) {
    return { success: false, error: 'Current password is incorrect' };
  }

  passwords[id] = newPassword;
  return { success: true };
}

export function resetStore() {
  const resetTime = new Date().toISOString();
  users = [
    {
      id: '1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: resetTime,
      updatedAt: resetTime,
    },
    {
      id: '2',
      email: 'power@example.com',
      name: 'Power User',
      role: UserRole.POWER_USER,
      isActive: true,
      createdAt: resetTime,
      updatedAt: resetTime,
    },
    {
      id: '3',
      email: 'user@example.com',
      name: 'Standard User',
      role: UserRole.STANDARD_USER,
      isActive: true,
      createdAt: resetTime,
      updatedAt: resetTime,
    },
    {
      id: '4',
      email: 'readonly@example.com',
      name: 'Read-Only User',
      role: UserRole.READ_ONLY,
      isActive: true,
      createdAt: resetTime,
      updatedAt: resetTime,
    },
  ];
  passwords['1'] = 'Admin123!';
  passwords['2'] = 'Power123!';
  passwords['3'] = 'User123!';
  passwords['4'] = 'Reader123!';
  nextId = 5;
}
