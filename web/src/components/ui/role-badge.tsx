import { UserRole, roleDescriptions } from '@/types/roles';

import { Badge } from './badge';

const roleVariantMap: Record<
  UserRole,
  { variant: 'destructive' | 'default' | 'secondary' | 'outline'; className?: string }
> = {
  [UserRole.ADMIN]: { variant: 'destructive' },
  [UserRole.POWER_USER]: {
    variant: 'outline',
    className: 'border-orange-500 text-orange-700 dark:text-orange-400',
  },
  [UserRole.STANDARD_USER]: { variant: 'default' },
  [UserRole.READ_ONLY]: { variant: 'secondary' },
};

const roleLabelMap: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.POWER_USER]: 'Power User',
  [UserRole.STANDARD_USER]: 'Standard',
  [UserRole.READ_ONLY]: 'Read Only',
};

export function RoleBadge({ role }: { role: UserRole }) {
  const config = roleVariantMap[role] ?? { variant: 'secondary' as const };

  return (
    <Badge
      variant={config.variant}
      className={config.className}
      title={roleDescriptions[role]}
    >
      {roleLabelMap[role] ?? role}
    </Badge>
  );
}
