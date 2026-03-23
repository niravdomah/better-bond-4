'use client';

import { useCallback, useEffect, useState } from 'react';

import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import { ProfileForm } from '@/components/profile/ProfileForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RoleBadge } from '@/components/ui/role-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { changePassword, getProfile, updateProfile } from '@/lib/api/users';
import type { User } from '@/types/user';

export function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setUser(data);
    } catch {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileUpdate = async (data: { name: string; email: string }) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await updateProfile(data);
      setUser(updated);
      setSuccessMessage('Profile updated successfully');
    } catch {
      setError('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await changePassword(data);
      setSuccessMessage('Password changed successfully');
    } catch {
      setError(
        'Failed to change password. Please check your current password.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <p className="text-destructive">Failed to load profile.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-muted-foreground">Role:</span>
          <RoleBadge role={user.role} />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {successMessage && (
        <div
          role="status"
          className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400"
        >
          {successMessage}
        </div>
      )}

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile Info</TabsTrigger>
          <TabsTrigger value="password">Change Password</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your name and email address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                user={user}
                onSubmit={handleProfileUpdate}
                isSubmitting={isSubmitting}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Enter your current password and choose a new one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm
                onSubmit={handlePasswordChange}
                isSubmitting={isSubmitting}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
