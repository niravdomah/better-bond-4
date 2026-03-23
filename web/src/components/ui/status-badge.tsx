import { Badge } from './badge';

export function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant={isActive ? 'default' : 'secondary'}
      className={
        isActive
          ? 'bg-green-600 text-white hover:bg-green-600'
          : 'bg-gray-400 text-white hover:bg-gray-400'
      }
    >
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}
