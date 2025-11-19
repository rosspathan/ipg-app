import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfferCountdownProps {
  endTime: string; // ISO timestamp
  className?: string;
}

export function OfferCountdown({ endTime, className = '' }: OfferCountdownProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const end = new Date(endTime);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      // Check urgency levels
      const hoursRemaining = diff / (1000 * 60 * 60);
      setIsCritical(hoursRemaining < 6);
      setIsUrgent(hoursRemaining < 24);

      // Format time left
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className={cn(
      "flex items-center justify-center gap-1 text-[10px] font-medium",
      isCritical ? "text-red-500" : isUrgent ? "text-orange-500" : "text-muted-foreground",
      className
    )}>
      <Clock className="h-3 w-3" />
      <span>Ends in {timeLeft}</span>
    </div>
  );
}
