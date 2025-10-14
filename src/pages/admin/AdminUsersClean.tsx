import { Users, UserPlus, Search } from "lucide-react";
import { CleanGrid } from "@/components/admin/clean/CleanGrid";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/admin/clean/StatusBadge";
import { EmptyState } from "@/components/admin/clean/EmptyState";

export default function AdminUsersClean() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(0_0%_98%)]">Users</h1>
          <p className="text-sm text-[hsl(220_9%_65%)] mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        <Button className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_70%)] text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Search & Filters */}
      <CleanCard padding="md">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(220_9%_46%)]" />
            <Input
              placeholder="Search users..."
              className="pl-10 bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%/0.4)] text-[hsl(0_0%_98%)]"
            />
          </div>
        </div>
      </CleanCard>

      {/* Users Table/List */}
      <CleanCard padding="none">
        <div className="divide-y divide-[hsl(220_13%_14%/0.4)]">
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-[hsl(220_13%_10%)]">
            <div className="text-xs uppercase font-semibold text-[hsl(220_9%_65%)]">User</div>
            <div className="text-xs uppercase font-semibold text-[hsl(220_9%_65%)]">Email</div>
            <div className="text-xs uppercase font-semibold text-[hsl(220_9%_65%)]">Status</div>
            <div className="text-xs uppercase font-semibold text-[hsl(220_9%_65%)]">Actions</div>
          </div>
          
          {/* Sample Row */}
          <div className="grid grid-cols-4 gap-4 px-6 py-4 hover:bg-[hsl(220_13%_12%)] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[hsl(262_100%_65%/0.1)] flex items-center justify-center">
                <Users className="w-5 h-5 text-[hsl(262_100%_65%)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[hsl(0_0%_98%)]">John Doe</p>
                <p className="text-xs text-[hsl(220_9%_65%)]">ID: 12345</p>
              </div>
            </div>
            <div className="flex items-center">
              <p className="text-sm text-[hsl(0_0%_98%)]">john@example.com</p>
            </div>
            <div className="flex items-center">
              <StatusBadge status="success" label="Verified" />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8">
                View
              </Button>
            </div>
          </div>
        </div>
      </CleanCard>
    </div>
  );
}
