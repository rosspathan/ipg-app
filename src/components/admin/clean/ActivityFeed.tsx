import { CleanCard } from "./CleanCard";
import { Clock, User, DollarSign, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "user" | "transaction" | "system" | "alert";
  title: string;
  description: string;
  timestamp: string;
  status?: "success" | "warning" | "danger";
}

interface ActivityFeedProps {
  activities?: Activity[];
  className?: string;
}

const activityIcons = {
  user: User,
  transaction: DollarSign,
  system: FileText,
  alert: AlertCircle,
};

const statusColors = {
  success: "text-[hsl(152_64%_48%)]",
  warning: "text-[hsl(33_93%_60%)]",
  danger: "text-[hsl(0_84%_60%)]",
};

const defaultActivities: Activity[] = [
  {
    id: "1",
    type: "user",
    title: "New User Registration",
    description: "user@example.com completed KYC verification",
    timestamp: "2 minutes ago",
    status: "success",
  },
  {
    id: "2",
    type: "transaction",
    title: "Large Withdrawal",
    description: "$15,000 withdrawal pending approval",
    timestamp: "15 minutes ago",
    status: "warning",
  },
  {
    id: "3",
    type: "alert",
    title: "System Alert",
    description: "High trading volume detected on BTC/USD",
    timestamp: "1 hour ago",
    status: "danger",
  },
  {
    id: "4",
    type: "system",
    title: "Program Updated",
    description: "Staking rewards pool replenished",
    timestamp: "2 hours ago",
  },
];

export function ActivityFeed({ activities = defaultActivities, className }: ActivityFeedProps) {
  return (
    <CleanCard padding="lg" className={className}>
      <h2 className="text-base font-semibold text-[hsl(0_0%_98%)] mb-4">
        Recent Activity
      </h2>
      <div className="space-y-4 relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-[hsl(220_13%_14%/0.4)]" />
        
        {activities.map((activity, index) => {
          const Icon = activityIcons[activity.type];
          return (
            <div 
              key={activity.id} 
              className={cn(
                "relative pl-10 group cursor-pointer hover:bg-[hsl(220_13%_12%)] -mx-2 px-2 py-2 rounded-lg transition-colors",
                index !== activities.length - 1 && "pb-4"
              )}
            >
              {/* Timeline dot */}
              <div className="absolute left-2.5 top-2.5 w-3 h-3 rounded-full bg-[hsl(220_13%_10%)] border-2 border-[hsl(262_100%_65%)] group-hover:scale-110 transition-transform" />
              
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-[hsl(262_100%_65%)] shrink-0" />
                    <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] truncate">
                      {activity.title}
                    </h3>
                    {activity.status && (
                      <span className={cn("text-xs", statusColors[activity.status])}>●</span>
                    )}
                  </div>
                  <p className="text-xs text-[hsl(220_9%_65%)] line-clamp-2">
                    {activity.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-[hsl(220_9%_46%)] shrink-0">
                  <Clock className="w-3 h-3" />
                  {activity.timestamp}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </CleanCard>
  );
}
