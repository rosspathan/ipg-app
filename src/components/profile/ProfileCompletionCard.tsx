import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { cn } from '@/lib/utils';

export const ProfileCompletionCard = () => {
  const { completion, loading } = useProfileCompletion();

  if (loading) {
    return (
      <Card className="bg-card/80 backdrop-blur-xl border-border/40">
        <CardHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  const completionItems = [
    { label: 'Profile Picture', completed: completion?.has_avatar || false },
    { label: 'Display Name', completed: completion?.has_display_name || false },
    { label: 'Phone Number', completed: completion?.has_phone || false },
    { label: 'Wallet Address', completed: completion?.has_wallet || false },
    { label: 'Two-Factor Auth', completed: completion?.has_2fa || false }
  ];

  const percentage = completion?.completion_percentage || 0;

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 backdrop-blur-xl border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Complete Your Profile</CardTitle>
        <CardDescription>
          {percentage === 100 
            ? 'Your profile is complete! 🎉' 
            : `${percentage}% complete - Keep going!`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold text-primary">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-3" />
        </div>

        {/* Completion Items */}
        <div className="space-y-2 pt-2">
          {completionItems.map((item, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-all duration-200",
                item.completed 
                  ? "text-foreground" 
                  : "text-muted-foreground hover:bg-muted/30"
              )}
            >
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Circle className="h-5 w-5 shrink-0" />
              )}
              <span className={cn(
                "text-sm",
                item.completed && "font-medium"
              )}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
