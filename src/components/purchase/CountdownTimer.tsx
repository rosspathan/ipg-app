import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  endDate: string;
  className?: string;
}

export const CountdownTimer = ({ endDate, className = '' }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const end = new Date(endDate);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Expired');
        return;
      }

      // Check if less than 24 hours remain
      setIsUrgent(diff < 24 * 60 * 60 * 1000);

      // Format time left
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [endDate]);

  if (isExpired) {
    return (
      <div className={`flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}>
        <Clock className="h-4 w-4" />
        <span>Expired</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 text-sm ${isUrgent ? 'text-destructive' : 'text-muted-foreground'} ${className}`}>
      <Clock className="h-4 w-4" />
      <span>Ends in {timeLeft}</span>
    </div>
  );
};
