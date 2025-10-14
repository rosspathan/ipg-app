import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

export function OnboardingHeader({
  title,
  showBack = true,
  onBack,
  rightAction,
  className
}: OnboardingHeaderProps) {
  return (
    <header className={cn("flex items-center justify-between w-full", className)}>
      <div className="min-w-[44px]">
        {showBack && onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="min-w-[44px] min-h-[44px] text-white hover:bg-white/10 rounded-xl"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
      </div>
      
      {title && (
        <h1 className="text-lg font-semibold text-white text-center flex-1">
          {title}
        </h1>
      )}
      
      <div className="min-w-[44px] flex justify-end">
        {rightAction}
      </div>
    </header>
  );
}
