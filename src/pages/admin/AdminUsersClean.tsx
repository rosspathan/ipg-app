import { Users, UserPlus, Search, ChevronLeft, ChevronRight, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/admin/clean/StatusBadge";
import { LoadingState, EmptyState } from "@/components/admin/clean";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { ForceDeleteDialog } from "@/components/admin/users/ForceDeleteDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

export default function AdminUsersClean() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string;
    isAdmin: boolean;
  } | null>(null);
  
  const { data, isLoading, error, refetch } = useAdminUsers({
    search: searchQuery,
    page: currentPage,
    limit: 20
  });

  const checkIfUserIsAdmin = async (userId: string): Promise<boolean> => {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    return !!roleData;
  };

  const handleDeleteClick = async (userId: string, userEmail: string) => {
    const isAdmin = await checkIfUserIsAdmin(userId);
    setSelectedUser({ id: userId, email: userEmail, isAdmin });
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    refetch();
  };

  const getKycStatusVariant = (status: string | null) => {
    switch (status) {
      case 'verified': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      default: return 'info';
    }
  };

  const getAccountStatusVariant = (status: string | null) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'danger';
      case 'pending': return 'warning';
      default: return 'info';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
              placeholder="Search users by name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%/0.4)] text-[hsl(0_0%_98%)]"
            />
          </div>
        </div>
      </CleanCard>

      {/* Loading State */}
      {isLoading && <LoadingState message="Loading users..." />}

      {/* Error State */}
      {error && (
        <CleanCard padding="lg">
          <p className="text-center text-[hsl(0_84%_60%)]">
            Failed to load users. Please try again.
          </p>
        </CleanCard>
      )}

      {/* Empty State */}
      {!isLoading && data && data.users.length === 0 && (
        <EmptyState
          icon={Users}
          title="No users found"
          description={searchQuery ? "Try adjusting your search query" : "No users in the system yet"}
        />
      )}

      {/* Users Table */}
      {!isLoading && data && data.users.length > 0 && (
        <>
          <CleanCard padding="none">
            <div className="divide-y divide-[hsl(220_13%_14%/0.4)]">
              {/* Desktop Header */}
              <div className="hidden md:grid md:grid-cols-4 gap-4 px-6 py-3 bg-[hsl(220_13%_10%)]">
                <div className="text-xs uppercase font-semibold text-[hsl(220_9%_65%)]">User</div>
                <div className="text-xs uppercase font-semibold text-[hsl(220_9%_65%)]">Email</div>
                <div className="text-xs uppercase font-semibold text-[hsl(220_9%_65%)]">Status</div>
                <div className="text-xs uppercase font-semibold text-[hsl(220_9%_65%)]">Actions</div>
              </div>
              
              {/* User Rows */}
              {data.users.map((user) => (
                <div 
                  key={user.user_id}
                  className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 px-6 py-4 hover:bg-[hsl(220_13%_12%)] transition-colors"
                >
                  {/* User Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[hsl(262_100%_65%/0.1)] flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-[hsl(262_100%_65%)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[hsl(0_0%_98%)] truncate">
                        {user.display_name || user.username || 'No name'}
                      </p>
                      <p className="text-xs text-[hsl(220_9%_65%)] truncate">
                        {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center min-w-0">
                    <p className="text-sm text-[hsl(0_0%_98%)] truncate">
                      {user.email || 'No email'}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge 
                      status={getKycStatusVariant(user.kyc_status)} 
                      label={user.kyc_status || 'No KYC'} 
                    />
                    <StatusBadge 
                      status={getAccountStatusVariant(user.account_status)} 
                      label={user.account_status || 'Unknown'} 
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8"
                    >
                      View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(user.user_id, user.email)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Force Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CleanCard>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[hsl(220_9%_65%)]">
                Page {currentPage} of {data.pages} ({data.total} total users)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === data.pages}
                  onClick={() => setCurrentPage(p => Math.min(data.pages, p + 1))}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Force Delete Dialog */}
      {selectedUser && (
        <ForceDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          userId={selectedUser.id}
          userEmail={selectedUser.email}
          isAdmin={selectedUser.isAdmin}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
