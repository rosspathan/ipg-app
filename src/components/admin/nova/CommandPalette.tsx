import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  Package,
  TrendingUp,
  FileText,
  Settings,
  Coins,
  Repeat,
  Gift,
  Megaphone,
  DollarSign,
  Search,
  Shield,
  RefreshCw,
  Ticket,
  CreditCard,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  icon?: React.ElementType;
  onSelect: () => void;
  group: "navigation" | "actions" | "recent";
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * CommandPalette - Global search/command (⌘K / Ctrl+K)
 * - Fuzzy search for navigation & actions
 * - Keyboard shortcuts
 * - Recent commands
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  const addToRecent = (commandId: string) => {
    setRecentCommands((prev) => {
      const filtered = prev.filter((id) => id !== commandId);
      return [commandId, ...filtered].slice(0, 5);
    });
  };

  const commands: Command[] = [
    // Navigation
    {
      id: "nav-dashboard",
      label: "Go to Dashboard",
      icon: LayoutDashboard,
      group: "navigation",
      keywords: ["home", "overview"],
      onSelect: () => {
        navigate("/admin");
        addToRecent("nav-dashboard");
      },
    },
    {
      id: "nav-catalog",
      label: "Go to Catalog",
      icon: Package,
      group: "navigation",
      keywords: ["assets", "tokens", "markets"],
      onSelect: () => {
        navigate("/admin/markets");
        addToRecent("nav-catalog");
      },
    },
    {
      id: "nav-programs",
      label: "Go to Programs",
      icon: TrendingUp,
      group: "navigation",
      keywords: ["staking", "spin", "draw", "insurance"],
      onSelect: () => {
        navigate("/admin/programs");
        addToRecent("nav-programs");
      },
    },
    {
      id: "nav-reports",
      label: "Go to Reports",
      icon: FileText,
      group: "navigation",
      keywords: ["analytics", "stats"],
      onSelect: () => {
        navigate("/admin/reports");
        addToRecent("nav-reports");
      },
    },
    {
      id: "nav-settings",
      label: "Go to Settings",
      icon: Settings,
      group: "navigation",
      keywords: ["config", "system"],
      onSelect: () => {
        navigate("/admin/settings");
        addToRecent("nav-settings");
      },
    },
    {
      id: "nav-users",
      label: "Go to Users",
      icon: Users,
      group: "navigation",
      keywords: ["manage", "accounts"],
      onSelect: () => {
        navigate("/admin/users");
        addToRecent("nav-users");
      },
    },
    {
      id: "nav-spin",
      label: "Go to Spin Wheel",
      icon: RefreshCw,
      group: "navigation",
      keywords: ["wheel", "game"],
      onSelect: () => {
        navigate("/admin/spin");
        addToRecent("nav-spin");
      },
    },
    {
      id: "nav-staking",
      label: "Go to Staking",
      icon: TrendingUp,
      group: "navigation",
      keywords: ["stake", "earn"],
      onSelect: () => {
        navigate("/admin/staking");
        addToRecent("nav-staking");
      },
    },
    {
      id: "nav-insurance",
      label: "Go to Insurance",
      icon: Shield,
      group: "navigation",
      keywords: ["protection", "coverage"],
      onSelect: () => {
        navigate("/admin/insurance");
        addToRecent("nav-insurance");
      },
    },
    {
      id: "nav-lucky-draw",
      label: "Go to Lucky Draw",
      icon: Ticket,
      group: "navigation",
      keywords: ["lottery", "draw"],
      onSelect: () => {
        navigate("/admin/lucky-draw");
        addToRecent("nav-lucky-draw");
      },
    },
    {
      id: "nav-referrals",
      label: "Go to Referrals",
      icon: UserPlus,
      group: "navigation",
      keywords: ["affiliate", "reward"],
      onSelect: () => {
        navigate("/admin/referrals");
        addToRecent("nav-referrals");
      },
    },
    {
      id: "nav-funding",
      label: "Go to Funding",
      icon: DollarSign,
      group: "navigation",
      keywords: ["deposits", "withdrawals"],
      onSelect: () => {
        navigate("/admin/funding");
        addToRecent("nav-funding");
      },
    },
    {
      id: "nav-ads",
      label: "Go to Ads",
      icon: Megaphone,
      group: "navigation",
      keywords: ["advertising", "campaigns"],
      onSelect: () => {
        navigate("/admin/ads");
        addToRecent("nav-ads");
      },
    },
    {
      id: "nav-subscriptions",
      label: "Go to Subscriptions",
      icon: CreditCard,
      group: "navigation",
      keywords: ["plans", "tiers"],
      onSelect: () => {
        navigate("/admin/subscriptions");
        addToRecent("nav-subscriptions");
      },
    },

    // Quick Actions
    {
      id: "action-list-token",
      label: "List Token",
      icon: Coins,
      group: "actions",
      keywords: ["add", "create", "asset"],
      onSelect: () => {
        navigate("/admin/markets");
        addToRecent("action-list-token");
      },
    },
    {
      id: "action-create-pair",
      label: "Create Pair",
      icon: Repeat,
      group: "actions",
      keywords: ["market", "trading"],
      onSelect: () => {
        navigate("/admin/markets");
        addToRecent("action-create-pair");
      },
    },
    {
      id: "action-start-draw",
      label: "Start Draw",
      icon: Gift,
      group: "actions",
      keywords: ["lucky", "lottery"],
      onSelect: () => {
        navigate("/admin/lucky-draw");
        addToRecent("action-start-draw");
      },
    },
    {
      id: "action-new-ad",
      label: "New Ad",
      icon: Megaphone,
      group: "actions",
      keywords: ["advertisement", "campaign"],
      onSelect: () => {
        navigate("/admin/ads");
        addToRecent("action-new-ad");
      },
    },
    {
      id: "action-purchase-bonus",
      label: "Create Purchase Bonus",
      icon: Gift,
      group: "actions",
      keywords: ["bonus", "reward"],
      onSelect: () => {
        navigate("/admin/purchase-bonus");
        addToRecent("action-purchase-bonus");
      },
    },
  ];

  const recentCommandsList = commands.filter((cmd) =>
    recentCommands.includes(cmd.id)
  );

  const navigationCommands = commands.filter((cmd) => cmd.group === "navigation");
  const actionCommands = commands.filter((cmd) => cmd.group === "actions");

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      data-testid="command-palette"
    >
      <CommandInput
        placeholder="Search commands or navigate..."
        className="h-12 border-b border-[hsl(225_24%_22%/0.16)]"
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No results found.</CommandEmpty>

        {recentCommandsList.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentCommandsList.map((cmd) => (
                <CommandItem
                  key={cmd.id}
                  value={cmd.label}
                  onSelect={() => {
                    cmd.onSelect();
                    onOpenChange(false);
                  }}
                  className="gap-2"
                >
                  {cmd.icon && <cmd.icon className="w-4 h-4" />}
                  <span>{cmd.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigation">
          {navigationCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              value={`${cmd.label} ${cmd.keywords?.join(" ")}`}
              onSelect={() => {
                cmd.onSelect();
                onOpenChange(false);
              }}
              className="gap-2"
            >
              {cmd.icon && <cmd.icon className="w-4 h-4" />}
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {actionCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              value={`${cmd.label} ${cmd.keywords?.join(" ")}`}
              onSelect={() => {
                cmd.onSelect();
                onOpenChange(false);
              }}
              className="gap-2"
            >
              {cmd.icon && <cmd.icon className="w-4 h-4" />}
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Hook to manage CommandPalette state
 * Usage: const { open, toggle } = useCommandPalette();
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return {
    open,
    setOpen,
    toggle: () => setOpen((o) => !o),
  };
}
