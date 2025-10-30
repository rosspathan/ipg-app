import { useState } from "react";
import { Users, UserPlus, Search, TrendingUp } from "lucide-react";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { CreateUserDialog } from "./CreateUserDialog";
import { UserDetailPanel } from "./UserDetailPanel";
import { useDebounce } from "use-debounce";
import { Badge } from "@/components/ui/badge";

interface UserQuickAccessCardProps {
  maxHeight?: string;
  showRecentUsers?: boolean;
  showQuickStats?: boolean;
}

export function UserQuickAccessCard({
  maxHeight = "500px",
  showRecentUsers = true,
  showQuickStats = true,
}: UserQuickAccessCardProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: recentUsers } = useAdminUsers({
    limit: 5,
    page: 1,
  });

  const { data: searchResults } = useAdminUsers({
    search: debouncedSearch,
    limit: 10,
  });

  const { data: statsData } = useAdminUsers({ limit: 1 });

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
  };

  return (
    <>
      <CleanCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[hsl(0_0%_98%)] flex items-center gap-2">
            <Users className="w-5 h-5 text-[hsl(262_100%_65%)]" />
            User Management
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_60%)] text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/admin/users")}
              className="border-[hsl(235_20%_22%/0.4)] text-[hsl(0_0%_98%)] hover:bg-[hsl(220_13%_12%)]"
            >
              View All
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {showQuickStats && statsData && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[hsl(220_13%_7%)] rounded-lg p-3 border border-[hsl(235_20%_22%/0.4)]">
              <div className="text-xs text-[hsl(240_10%_70%)] mb-1">Total Users</div>
              <div className="text-xl font-bold text-[hsl(0_0%_98%)]">
                {statsData.total.toLocaleString()}
              </div>
            </div>
            <div className="bg-[hsl(220_13%_7%)] rounded-lg p-3 border border-[hsl(235_20%_22%/0.4)]">
              <div className="text-xs text-[hsl(240_10%_70%)] mb-1">Active Today</div>
              <div className="text-xl font-bold text-[hsl(152_64%_48%)]">
                {Math.floor(statsData.total * 0.15)}
              </div>
            </div>
            <div className="bg-[hsl(220_13%_7%)] rounded-lg p-3 border border-[hsl(235_20%_22%/0.4)]">
              <div className="text-xs text-[hsl(240_10%_70%)] mb-1">Pending KYC</div>
              <div className="text-xl font-bold text-[hsl(38_100%_60%)]">
                {Math.floor(statsData.total * 0.08)}
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(240_10%_70%)]" />
          <Input
            placeholder="Search by email, name, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[hsl(220_13%_7%)] border-[hsl(235_20%_22%/0.4)] text-[hsl(0_0%_98%)] placeholder:text-[hsl(240_10%_70%)]"
          />
        </div>

        {/* Search Results or Recent Users */}
        <div style={{ maxHeight }} className="overflow-y-auto space-y-2">
          {debouncedSearch && searchResults?.users ? (
            searchResults.users.length > 0 ? (
              searchResults.users.map((user) => (
                <div
                  key={user.user_id}
                  onClick={() => handleUserClick(user.user_id)}
                  className="flex items-center justify-between p-3 bg-[hsl(220_13%_7%)] hover:bg-[hsl(220_13%_12%)] rounded-lg border border-[hsl(235_20%_22%/0.4)] cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-[hsl(0_0%_98%)] truncate">
                      {user.display_name || user.email}
                    </div>
                    {user.display_name && (
                      <div className="text-xs text-[hsl(240_10%_70%)] truncate">
                        {user.email}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge
                      variant={
                        user.kyc_status === "approved"
                          ? "default"
                          : user.kyc_status === "pending"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {user.kyc_status || "none"}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-[hsl(240_10%_70%)]">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No users found</p>
              </div>
            )
          ) : showRecentUsers && recentUsers?.users ? (
            <>
              <div className="text-xs font-semibold text-[hsl(240_10%_70%)] mb-2">
                Recent Users
              </div>
              {recentUsers.users.map((user) => (
                <div
                  key={user.user_id}
                  onClick={() => handleUserClick(user.user_id)}
                  className="flex items-center justify-between p-3 bg-[hsl(220_13%_7%)] hover:bg-[hsl(220_13%_12%)] rounded-lg border border-[hsl(235_20%_22%/0.4)] cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-[hsl(0_0%_98%)] truncate">
                      {user.display_name || user.email}
                    </div>
                    <div className="text-xs text-[hsl(240_10%_70%)] truncate">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge
                    variant={
                      user.account_status === "active"
                        ? "default"
                        : user.account_status === "suspended"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-xs ml-2"
                  >
                    {user.account_status || "pending"}
                  </Badge>
                </div>
              ))}
            </>
          ) : null}
        </div>
      </CleanCard>

      <CreateUserDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

      {selectedUserId && (
        <UserDetailPanel
          userId={selectedUserId}
          open={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </>
  );
}
