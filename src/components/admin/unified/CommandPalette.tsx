import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { UserPlus, Coins } from "lucide-react";
import { adminNavGroups } from "./adminNav";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  const go = (url: string) => {
    navigate(url);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages and actions…" />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => go("/admin/tokens?new=1")} value="add token new asset listing">
            <Coins className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span>Add Token</span>
              <span className="text-xs text-muted-foreground">List a new token for trading and portfolios</span>
            </div>
          </CommandItem>
          <CommandItem onSelect={() => go("/admin/users?action=create")} value="create user new account">
            <UserPlus className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span>Create User</span>
              <span className="text-xs text-muted-foreground">Add a new user account</span>
            </div>
          </CommandItem>
        </CommandGroup>

        {adminNavGroups.map((group) => (
          <CommandGroup key={group.id} heading={group.label}>
            {group.items.map((item) => (
              <CommandItem
                key={item.url}
                onSelect={() => go(item.url)}
                value={`${item.title} ${group.label} ${item.keywords?.join(" ") ?? ""}`}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{item.url.replace("/admin", "") || "/"}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
