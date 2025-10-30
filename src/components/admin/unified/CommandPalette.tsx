import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Shield,
  Wallet,
  Settings,
  TrendingUp,
  FileText,
  Database,
  Bell,
  BarChart3,
  UserPlus,
  Search,
} from "lucide-react";

interface Command {
  id: string;
  title: string;
  description?: string;
  icon: any;
  action: () => void;
  category: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  const commands: Command[] = [
    {
      id: "dashboard",
      title: "Go to Dashboard",
      description: "View admin overview",
      icon: LayoutDashboard,
      category: "Navigation",
      action: () => {
        navigate("/admin");
        onOpenChange(false);
      },
    },
    {
      id: "users",
      title: "Manage Users",
      description: "View and edit users",
      icon: Users,
      category: "Navigation",
      action: () => {
        navigate("/admin/users");
        onOpenChange(false);
      },
    },
    {
      id: "create-user",
      title: "Create New User",
      description: "Add a new user to the platform",
      icon: UserPlus,
      category: "Actions",
      action: () => {
        navigate("/admin?action=create-user");
        onOpenChange(false);
      },
    },
    {
      id: "search-user",
      title: "Search Users",
      description: "Find and manage users",
      icon: Search,
      category: "Actions",
      action: () => {
        navigate("/admin/users?focus=search");
        onOpenChange(false);
      },
    },
    {
      id: "programs",
      title: "Manage Programs",
      description: "Edit program configurations",
      icon: FolderKanban,
      category: "Navigation",
      action: () => {
        navigate("/admin/programs");
        onOpenChange(false);
      },
    },
    {
      id: "kyc",
      title: "KYC Reviews",
      description: "Review pending KYC submissions",
      icon: Shield,
      category: "Actions",
      action: () => {
        navigate("/admin/kyc-review");
        onOpenChange(false);
      },
    },
    {
      id: "withdrawals",
      title: "BSK Withdrawals",
      description: "Approve pending withdrawals",
      icon: Wallet,
      category: "Actions",
      action: () => {
        navigate("/admin/bsk-withdrawals");
        onOpenChange(false);
      },
    },
    {
      id: "markets",
      title: "Markets",
      description: "Manage trading pairs",
      icon: TrendingUp,
      category: "Navigation",
      action: () => {
        navigate("/admin/markets");
        onOpenChange(false);
      },
    },
    {
      id: "analytics",
      title: "Analytics",
      description: "View platform analytics",
      icon: BarChart3,
      category: "Navigation",
      action: () => {
        navigate("/admin/analytics");
        onOpenChange(false);
      },
    },
    {
      id: "announcements",
      title: "Announcements",
      description: "Create system announcements",
      icon: Bell,
      category: "Content",
      action: () => {
        navigate("/admin/announcements");
        onOpenChange(false);
      },
    },
    {
      id: "system-health",
      title: "System Health",
      description: "Monitor system status",
      icon: Database,
      category: "System",
      action: () => {
        navigate("/admin/system-health");
        onOpenChange(false);
      },
    },
    {
      id: "settings",
      title: "Settings",
      description: "Configure platform settings",
      icon: Settings,
      category: "System",
      action: () => {
        navigate("/admin/settings");
        onOpenChange(false);
      },
    },
  ];

  // Group commands by category
  const categories = Array.from(new Set(commands.map((cmd) => cmd.category)));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {categories.map((category) => (
          <CommandGroup key={category} heading={category}>
            {commands
              .filter((cmd) => cmd.category === category)
              .map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <CommandItem
                    key={cmd.id}
                    onSelect={cmd.action}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{cmd.title}</span>
                      {cmd.description && (
                        <span className="text-xs text-muted-foreground">
                          {cmd.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
