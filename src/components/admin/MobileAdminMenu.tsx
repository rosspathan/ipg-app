import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  LayoutDashboard,
  Users,
  Coins,
  LineChart,
  Banknote,
  BadgePercent,
  Share2,
  Layers,
  Pointer,
  Gift,
  ShieldCheck,
  Megaphone,
  ReceiptText,
  ArrowLeftRight,
  ShieldAlert,
  BarChart3,
  Settings,
  ChevronRight,
} from "lucide-react";

const items = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Assets", url: "/admin/assets", icon: Coins },
  { title: "Markets", url: "/admin/markets", icon: LineChart },
  { title: "Funding", url: "/admin/funding", icon: Banknote },
  { title: "Subscriptions", url: "/admin/subscriptions", icon: BadgePercent },
  { title: "Referrals", url: "/admin/referrals", icon: Share2 },
  { title: "Staking", url: "/admin/staking", icon: Layers },
  { title: "Spin Wheel", url: "/admin/lucky", icon: Pointer },
  { title: "Lucky Draw", url: "/admin/lucky/draw", icon: Gift },
  { title: "Insurance", url: "/admin/insurance", icon: ShieldCheck },
  { title: "Ads", url: "/admin/ads", icon: Megaphone },
  { title: "Fees", url: "/admin/fees", icon: ReceiptText },
  { title: "Transfers", url: "/admin/transfers", icon: ArrowLeftRight },
  { title: "Compliance", url: "/admin/compliance", icon: ShieldAlert },
  { title: "Reports", url: "/admin/reports", icon: BarChart3 },
  { title: "System", url: "/admin/system", icon: Settings },
] as const;

export default function MobileAdminMenu({ className = "" }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const go = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={className} aria-label="Open admin menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 max-w-[80vw] bg-card text-card-foreground">
        <SheetHeader>
          <SheetTitle>Admin Navigation</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1">
          {items.map((item) => {
            const ActiveIcon = item.icon;
            const active = item.url === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(item.url);
            return (
              <Button
                key={item.url}
                variant={active ? "default" : "ghost"}
                className="w-full justify-between h-11"
                onClick={() => go(item.url)}
              >
                <span className="flex items-center gap-3">
                  <ActiveIcon className="h-4 w-4" />
                  {item.title}
                </span>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </Button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
