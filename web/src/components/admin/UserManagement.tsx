'use client';

import { useCallback, useEffect, useState } from 'react';

import { DeactivateConfirmDialog } from '@/components/admin/DeactivateConfirmDialog';
import { UserFilters } from '@/components/admin/UserFilters';
import { UserFormDialog } from '@/components/admin/UserFormDialog';
import { UserTable } from '@/components/admin/UserTable';
import { Button } from '@/components/ui/button';
import {
  activateUser,
  createUser,
  deactivateUser,
  getUsers,
  updateUser,
} from '@/lib/api/users';
import type { UserRole } from '@/types/roles';
import type { CreateUserRequest, UpdateUserRequest, User } from '@/types/user';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number | boolean | undefined> = {
        page,
        limit,
      };
      if (search) params.search = search;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active';

      const data = await getUsers(
        params as {
          page?: number;
          limit?: number;
          search?: string;
          role?: UserRole;
          isActive?: boolean;
        },
      );
      setUsers(data.users);
      setTotal(data.total);
      setError(null);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const handleCreate = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleFormSubmit = async (
    data: CreateUserRequest | Omit<CreateUserRequest, 'password'>,
  ) => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, data as UpdateUserRequest);
      } else {
        await createUser(data as CreateUserRequest);
      }
      setFormOpen(false);
      setEditingUser(null);
      await fetchUsers();
    } catch {
      setError(editingUser ? 'Failed to update user' : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = (user: User) => {
    setDeactivatingUser(user);
    setDeactivateOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingUser) return;
    setError(null);
    try {
      await deactivateUser(deactivatingUser.id);
      setDeactivateOpen(false);
      setDeactivatingUser(null);
      await fetchUsers();
    } catch {
      setError('Failed to deactivate user');
    }
  };

  const handleActivate = async (user: User) => {
    setError(null);
    try {
      await activateUser(user.id);
      await fetchUsers();
    } catch {
      setError('Failed to activate user');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            {total} user{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button onClick={handleCreate}>Create User</Button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="mb-4">
        <UserFilters
          search={search}
          onSearchChange={setSearch}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>

      <UserTable
        users={users}
        loading={loading}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
        onActivate={handleActivate}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      <DeactivateConfirmDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        user={deactivatingUser}
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  );
}
