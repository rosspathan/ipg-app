import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProgramLockBadgeProps {
  isLocked: boolean;
  className?: string;
}

export function ProgramLockBadge({ isLocked, className = '' }: ProgramLockBadgeProps) {
  if (!isLocked) return null;

  return (
    <Badge 
      variant="secondary" 
      className={`flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 ${className}`}
    >
      <Lock className="w-3 h-3" />
      Locked
    </Badge>
  );
}
