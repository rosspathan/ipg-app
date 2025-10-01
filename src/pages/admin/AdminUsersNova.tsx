import * as React from "react";
import { useState } from "react";
import { Eye, Ban, Mail, Download, Edit } from "lucide-react";
import { DataGridAdaptive } from "@/components/admin/nova/DataGridAdaptive";
import { RecordCard } from "@/components/admin/nova/RecordCard";
import { FilterChips, type FilterGroup } from "@/components/admin/nova/FilterChips";
import { FilterSheet } from "@/components/admin/nova/FilterSheet";
import { DetailSheet } from "@/components/admin/nova/DetailSheet";
import { FormKit, type FormField } from "@/components/admin/nova/FormKit";
import { AuditTrailViewer } from "@/components/admin/nova/AuditTrailViewer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  name: string;
  status: "active" | "flagged" | "banned";
  kycStatus: "pending" | "verified" | "rejected";
  region: string;
  badge: string;
  balance: number;
  createdAt: string;
}

// Mock data
const mockUsers: User[] = [
  {
    id: "1",
    email: "user1@example.com",
    name: "John Doe",
    status: "active",
    kycStatus: "verified",
    region: "IN",
    badge: "Gold",
    balance: 12500,
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    email: "user2@example.com",
    name: "Jane Smith",
    status: "flagged",
    kycStatus: "pending",
    region: "US",
    badge: "Silver",
    balance: 5200,
    createdAt: "2024-02-20",
  },
  {
    id: "3",
    email: "user3@example.com",
    name: "Bob Johnson",
    status: "active",
    kycStatus: "verified",
    region: "UK",
    badge: "Platinum",
    balance: 45000,
    createdAt: "2024-03-10",
  },
];

const mockAuditEntries = [
  {
    id: "a1",
    timestamp: "2024-10-01 14:23",
    operator: "Admin",
    action: "Updated user profile",
    changes: [
      { field: "status", before: "flagged", after: "active" },
      { field: "kycStatus", before: "pending", after: "verified" },
    ],
  },
  {
    id: "a2",
    timestamp: "2024-09-28 09:15",
    operator: "System",
    action: "Account created",
    changes: [
      { field: "email", before: null, after: "user3@example.com" },
      { field: "status", before: null, after: "active" },
    ],
  },
];

/**
 * AdminUsersNova - Users management page (Phase 2 Demo)
 * Demonstrates: DataGridAdaptive, RecordCard, FilterChips, FilterSheet,
 * DetailSheet, FormKit, AuditTrailViewer
 */
export default function AdminUsersNova() {
  const [users] = useState<User[]>(mockUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Form state for DetailSheet
  const [formData, setFormData] = useState<Partial<User>>({});

  const filterGroups: FilterGroup[] = [
    {
      id: "status",
      label: "Status",
      options: [
        { id: "active", label: "Active", value: "active" },
        { id: "flagged", label: "Flagged", value: "flagged" },
        { id: "banned", label: "Banned", value: "banned" },
      ],
    },
    {
      id: "kycStatus",
      label: "KYC Status",
      options: [
        { id: "verified", label: "Verified", value: "verified" },
        { id: "pending", label: "Pending", value: "pending" },
        { id: "rejected", label: "Rejected", value: "rejected" },
      ],
    },
    {
      id: "region",
      label: "Region",
      options: [
        { id: "in", label: "India", value: "IN" },
        { id: "us", label: "United States", value: "US" },
        { id: "uk", label: "United Kingdom", value: "UK" },
      ],
    },
  ];

  const filteredUsers = users.filter((user) => {
    // Search filter
    if (searchValue && !user.email.toLowerCase().includes(searchValue.toLowerCase()) &&
        !user.name.toLowerCase().includes(searchValue.toLowerCase())) {
      return false;
    }

    // Active filters
    for (const [key, values] of Object.entries(activeFilters)) {
      if (values.length > 0 && !values.includes((user as any)[key])) {
        return false;
      }
    }

    return true;
  });

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setFormData(user);
  };

  const handleSave = () => {
    toast.success("User updated successfully");
    setSelectedUser(null);
  };

  const formFields: FormField[] = [
    {
      id: "name",
      type: "text",
      label: "Full Name",
      value: formData.name || "",
      onChange: (v) => setFormData({ ...formData, name: v }),
      required: true,
      span: 2,
    },
    {
      id: "email",
      type: "email",
      label: "Email",
      value: formData.email || "",
      onChange: (v) => setFormData({ ...formData, email: v }),
      required: true,
      span: 2,
    },
    {
      id: "status",
      type: "select",
      label: "Status",
      value: formData.status || "",
      onChange: (v) => setFormData({ ...formData, status: v }),
      options: [
        { label: "Active", value: "active" },
        { label: "Flagged", value: "flagged" },
        { label: "Banned", value: "banned" },
      ],
    },
    {
      id: "kycStatus",
      type: "select",
      label: "KYC Status",
      value: formData.kycStatus || "",
      onChange: (v) => setFormData({ ...formData, kycStatus: v }),
      options: [
        { label: "Verified", value: "verified" },
        { label: "Pending", value: "pending" },
        { label: "Rejected", value: "rejected" },
      ],
    },
  ];

  return (
    <div data-testid="page-admin-users" className="space-y-4 p-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredUsers.length} of {users.length} users
          </p>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent border-[hsl(225_24%_22%/0.16)]"
              onClick={() => toast.info("Bulk export started")}
            >
              <Download className="w-4 h-4" />
              Export ({selectedIds.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent border-[hsl(225_24%_22%/0.16)]"
              onClick={() => toast.info("Email sent to selected users")}
            >
              <Mail className="w-4 h-4" />
              Email
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <FilterChips
        groups={filterGroups}
        activeFilters={activeFilters}
        onFiltersChange={setActiveFilters}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onOpenSheet={() => setShowFilters(true)}
      />

      {/* Data Grid */}
      <DataGridAdaptive
        data={filteredUsers}
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "status", label: "Status" },
          { key: "badge", label: "Badge" },
        ]}
        keyExtractor={(user) => user.id}
        renderCard={(user, selected) => (
          <RecordCard
            id={user.id}
            title={user.name}
            subtitle={user.email}
            status={{
              label: user.status,
              variant: user.status === "active" ? "success" : user.status === "flagged" ? "warning" : "danger",
            }}
            fields={[
              { label: "KYC", value: user.kycStatus },
              { label: "Badge", value: user.badge, variant: "primary" },
              { label: "Balance", value: `$${user.balance.toLocaleString()}`, variant: "accent" },
              { label: "Region", value: user.region },
            ]}
            actions={[
              { label: "View", icon: Eye, onClick: () => handleUserClick(user) },
              { label: "Edit", icon: Edit, onClick: () => handleUserClick(user) },
              { label: "Ban", icon: Ban, onClick: () => toast.error("User banned"), variant: "destructive" },
            ]}
            onClick={() => handleUserClick(user)}
            selected={selected}
          />
        )}
        onRowClick={handleUserClick}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Filter Sheet */}
      <FilterSheet
        open={showFilters}
        onOpenChange={setShowFilters}
        groups={filterGroups}
        activeFilters={activeFilters}
        onFiltersChange={setActiveFilters}
      />

      {/* Detail Sheet */}
      <DetailSheet
        open={!!selectedUser}
        onOpenChange={() => setSelectedUser(null)}
        title={selectedUser?.name || "User Details"}
        tabs={[
          {
            id: "profile",
            label: "Profile",
            content: <FormKit fields={formFields} layout="2col" />,
          },
          {
            id: "wallet",
            label: "Wallet",
            content: (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Wallet details coming soon...</p>
              </div>
            ),
          },
          {
            id: "audit",
            label: "Audit",
            content: (
              <AuditTrailViewer
                entries={mockAuditEntries}
                onExport={(format) => toast.success(`Exported as ${format.toUpperCase()}`)}
              />
            ),
          },
        ]}
        actions={{
          primary: {
            label: "Save Changes",
            onClick: handleSave,
          },
          secondary: {
            label: "Cancel",
            onClick: () => setSelectedUser(null),
          },
        }}
      />
    </div>
  );
}
