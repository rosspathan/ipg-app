import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock } from "lucide-react";

interface PriorityBadgeProps {
  daysPending: number;
}

export const PriorityBadge = ({ daysPending }: PriorityBadgeProps) => {
  if (daysPending > 7) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="w-3 h-3" />
        HIGH PRIORITY
      </Badge>
    );
  }
  
  if (daysPending >= 3) {
    return (
      <Badge className="gap-1 bg-warning/20 text-warning border-warning/40">
        <Clock className="w-3 h-3" />
        MEDIUM
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="w-3 h-3" />
      NORMAL
    </Badge>
  );
};
