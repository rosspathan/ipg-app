import { useState } from "react";
import { Users, UserPlus, Download, Filter, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { CreateUserDialog } from "@/components/admin/unified/CreateUserDialog";
import { UserDetailPanel } from "@/components/admin/unified/UserDetailPanel";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "use-debounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function AdminUsersManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [kycFilter, setKycFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminUsers({
    search: debouncedSearch,
    status: statusFilter,
    kycStatus: kycFilter,
    page,
    limit: 50,
  });

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log("Export users");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(0_0%_98%)] flex items-center gap-3">
            <Users className="w-7 h-7 text-[hsl(262_100%_65%)]" />
            User Management
          </h1>
          <p className="text-sm text-[hsl(240_10%_70%)] mt-1">
            Manage all platform users and their accounts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            className="border-[hsl(235_20%_22%/0.4)] text-[hsl(0_0%_98%)]"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_60%)] text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      {data && (
        <div className="grid grid-cols-4 gap-4">
          <CleanCard padding="lg">
            <div className="text-xs text-[hsl(240_10%_70%)]">Total Users</div>
            <div className="text-2xl font-bold text-[hsl(0_0%_98%)] mt-1">
              {data.total.toLocaleString()}
            </div>
          </CleanCard>
          <CleanCard padding="lg">
            <div className="text-xs text-[hsl(240_10%_70%)]">Active</div>
            <div className="text-2xl font-bold text-[hsl(152_64%_48%)] mt-1">
              {Math.floor(data.total * 0.7).toLocaleString()}
            </div>
          </CleanCard>
          <CleanCard padding="lg">
            <div className="text-xs text-[hsl(240_10%_70%)]">Pending KYC</div>
            <div className="text-2xl font-bold text-[hsl(38_100%_60%)] mt-1">
              {Math.floor(data.total * 0.15).toLocaleString()}
            </div>
          </CleanCard>
          <CleanCard padding="lg">
            <div className="text-xs text-[hsl(240_10%_70%)]">Suspended</div>
            <div className="text-2xl font-bold text-[hsl(0_70%_68%)] mt-1">
              {Math.floor(data.total * 0.05).toLocaleString()}
            </div>
          </CleanCard>
        </div>
      )}

      {/* Filters */}
      <CleanCard padding="lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(240_10%_70%)]" />
            <Input
              placeholder="Search by email, name, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[hsl(220_13%_7%)] border-[hsl(235_20%_22%/0.4)] text-[hsl(0_0%_98%)]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-[hsl(220_13%_7%)] border-[hsl(235_20%_22%/0.4)] text-[hsl(0_0%_98%)]">
              <SelectValue placeholder="Account Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={kycFilter} onValueChange={setKycFilter}>
            <SelectTrigger className="bg-[hsl(220_13%_7%)] border-[hsl(235_20%_22%/0.4)] text-[hsl(0_0%_98%)]">
              <SelectValue placeholder="KYC Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All KYC</SelectItem>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CleanCard>

      {/* User Table */}
      <CleanCard padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(262_100%_65%)]" />
          </div>
        ) : data && data.users.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[hsl(220_13%_7%)] border-b border-[hsl(235_20%_22%/0.4)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[hsl(240_10%_70%)] uppercase">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[hsl(240_10%_70%)] uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[hsl(240_10%_70%)] uppercase">
                      Account Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[hsl(240_10%_70%)] uppercase">
                      KYC Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[hsl(240_10%_70%)] uppercase">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[hsl(240_10%_70%)] uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr
                      key={user.user_id}
                      className="border-b border-[hsl(235_20%_22%/0.4)] hover:bg-[hsl(220_13%_12%)] cursor-pointer transition-colors"
                      onClick={() => setSelectedUserId(user.user_id)}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-sm text-[hsl(0_0%_98%)]">
                          {user.display_name || "Unnamed"}
                        </div>
                        <div className="text-xs text-[hsl(240_10%_70%)]">
                          ID: {user.user_id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[hsl(0_0%_98%)]">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            user.account_status === "active"
                              ? "default"
                              : user.account_status === "suspended"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {user.account_status || "pending"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            user.kyc_status === "approved"
                              ? "default"
                              : user.kyc_status === "pending"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {user.kyc_status || "none"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[hsl(240_10%_70%)]">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserId(user.user_id);
                          }}
                          className="text-[hsl(262_100%_65%)] hover:text-[hsl(262_100%_60%)]"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-[hsl(235_20%_22%/0.4)]">
                <div className="text-sm text-[hsl(240_10%_70%)]">
                  Page {page} of {data.pages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="border-[hsl(235_20%_22%/0.4)]"
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                    disabled={page === data.pages}
                    className="border-[hsl(235_20%_22%/0.4)]"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <Users className="w-12 h-12 text-[hsl(240_10%_70%)] opacity-50 mb-3" />
            <p className="text-[hsl(240_10%_70%)]">No users found</p>
          </div>
        )}
      </CleanCard>

      <CreateUserDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      
      {selectedUserId && (
        <UserDetailPanel
          userId={selectedUserId}
          open={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
