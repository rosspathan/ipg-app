import { LucideIcon, Plus, Users, FolderKanban, FileText, Settings, DollarSign, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CleanCard } from "./CleanCard";
import { useNavigate } from "react-router-dom";

interface QuickAction {
  label: string;
  icon: LucideIcon;
  path: string;
}

const quickActions: QuickAction[] = [
  { label: "New Program", icon: Plus, path: "/admin/programs/editor/new" },
  { label: "Manage Users", icon: Users, path: "/admin/users" },
  { label: "View Markets", icon: TrendingUp, path: "/admin/markets" },
  { label: "KYC Reviews", icon: Shield, path: "/admin/kyc-review" },
  { label: "BSK Management", icon: DollarSign, path: "/admin/bsk" },
  { label: "Reports", icon: FileText, path: "/admin/reports" },
  { label: "Programs", icon: FolderKanban, path: "/admin/programs" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

interface QuickActionsGridProps {
  className?: string;
}

export function QuickActionsGrid({ className }: QuickActionsGridProps) {
  const navigate = useNavigate();

  return (
    <CleanCard padding="lg" className={className}>
      <h2 className="text-base font-semibold text-[hsl(0_0%_98%)] mb-4">
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            onClick={() => navigate(action.path)}
            className="h-20 flex-col gap-2 bg-[hsl(220_13%_10%)] hover:bg-[hsl(220_13%_12%)] border border-[hsl(220_13%_14%/0.4)] text-[hsl(0_0%_98%)] justify-center"
          >
            <action.icon className="w-5 h-5 text-[hsl(262_100%_65%)]" />
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>
    </CleanCard>
  );
}
