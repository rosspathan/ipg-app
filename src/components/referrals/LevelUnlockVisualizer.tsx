import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LevelUnlockVisualizerProps {
  userBadge: {
    badge_name: string;
    unlock_levels: number;
  } | null;
}

const badgeUpgradePath = [
  { name: 'None', levels: 1, color: 'gray' },
  { name: 'Silver', levels: 10, color: 'slate' },
  { name: 'Gold', levels: 20, color: 'yellow' },
  { name: 'Platinum', levels: 30, color: 'cyan' },
  { name: 'Diamond', levels: 40, color: 'blue' },
  { name: 'i-Smart VIP', levels: 50, color: 'purple' },
];

function getNextBadge(currentLevels: number) {
  return badgeUpgradePath.find(b => b.levels > currentLevels) || badgeUpgradePath[badgeUpgradePath.length - 1];
}

export function LevelUnlockVisualizer({ userBadge }: LevelUnlockVisualizerProps) {
  const unlockedLevels = userBadge?.unlock_levels || 1;
  const nextBadge = getNextBadge(unlockedLevels);
  const isMaxLevel = unlockedLevels >= 50;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Unlock className="w-5 h-5" />
          Your Badge: {userBadge?.badge_name || 'No Badge'}
        </CardTitle>
        <CardDescription>
          Unlocked Levels: {unlockedLevels} / 50
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level Grid */}
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 50 }, (_, i) => i + 1).map(level => {
            const isUnlocked = level <= unlockedLevels;
            return (
              <div
                key={level}
                className={cn(
                  "w-9 h-9 rounded flex items-center justify-center text-xs font-medium transition-colors",
                  isUnlocked
                    ? "bg-green-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground border border-border"
                )}
                title={isUnlocked ? `Level ${level} Unlocked` : `Level ${level} Locked`}
              >
                {isUnlocked ? level : <Lock className="w-3 h-3" />}
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{unlockedLevels}/50 levels</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
              style={{ width: `${(unlockedLevels / 50) * 100}%` }}
            />
          </div>
        </div>

        {/* Upgrade Suggestion */}
        {!isMaxLevel && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Upgrade to {nextBadge.name}</strong> to unlock up to Level {nextBadge.levels} and earn from deeper referrals!
              <div className="mt-2 flex flex-wrap gap-1">
                {badgeUpgradePath.map(badge => (
                  <Badge
                    key={badge.name}
                    variant={badge.name === userBadge?.badge_name ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {badge.name} (L1-{badge.levels})
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isMaxLevel && (
          <Alert className="border-purple-200 bg-purple-50">
            <Trophy className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-900">
              🎉 <strong>Maximum Level!</strong> You've unlocked all 50 levels and can earn from your entire network!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function Trophy({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
