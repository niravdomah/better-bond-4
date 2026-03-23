import { requireExactRole } from '@/lib/auth/auth-server';
import { UserRole } from '@/types/roles';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({
  children,
}: AdminLayoutProps): Promise<React.ReactElement> {
  await requireExactRole(UserRole.ADMIN);

  return <>{children}</>;
}
