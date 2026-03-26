import { User } from '../data/mockData';

interface AvatarGroupProps {
  users: User[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarGroup({ users, max = 4, size = 'md' }: AvatarGroupProps) {
  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  return (
    <div className="flex -space-x-2">
      {displayUsers.map((user, index) => (
        <div
          key={user.id}
          className={`${sizeClasses[size]} rounded-full border-2 border-[#0a0a0f] overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 relative`}
          style={{ zIndex: displayUsers.length - index }}
        >
          <img
            src={user.avatar}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={`${sizeClasses[size]} rounded-full border-2 border-[#0a0a0f] bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center`}
          style={{ zIndex: 0 }}
        >
          <span className="text-white">+{remaining}</span>
        </div>
      )}
    </div>
  );
}
