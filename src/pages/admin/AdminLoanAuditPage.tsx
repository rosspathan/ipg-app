import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useLoanHistory, useLoanAuditStats, LoanHistoryEvent } from "@/hooks/useLoanHistory";
import { LoanActivityTimeline } from "@/components/loans/LoanActivityTimeline";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { CleanCard } from "@/components/admin/clean/CleanCard";
import { CleanMetricCard } from "@/components/admin/clean/CleanMetricCard";
import { CleanGrid } from "@/components/admin/clean/CleanGrid";
import { EmptyState } from "@/components/admin/clean/EmptyState";

import {
  Search,
  RefreshCw,
  Download,
  Filter,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  FileText,
  ChevronRight,
  AlertTriangle,
  Landmark,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EventFilter = "all" | "emi_paid" | "settlement" | "foreclosed" | "completed" | "overdue";
type StatusFilter = "all" | "active" | "closed" | "cancelled" | "pending";

export default function AdminLoanAuditPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);

  // Fetch all loan history
  const { data: allEvents, isLoading: eventsLoading, refetch } = useLoanHistory({
    includeAllUsers: true,
    limit: 500,
  });

  // Fetch aggregated stats
  const { data: stats, isLoading: statsLoading } = useLoanAuditStats();

  // Fetch all loans with user info for the table
  const { data: loansWithUsers } = useQuery({
    queryKey: ["admin-loans-with-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bsk_loans")
        .select(`
          *,
          profiles(email, full_name, username)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch selected user's loan history
  const { data: userEvents, isLoading: userEventsLoading } = useLoanHistory({
    userId: selectedUserId || undefined,
    limit: 200,
  });

  // Filter events based on search and filters
  const filteredEvents = useMemo(() => {
    if (!allEvents) return [];

    return allEvents.filter((event) => {
      // Event type filter
      if (eventFilter !== "all") {
        if (eventFilter === "emi_paid" && event.event_type !== "emi_paid") return false;
        if (eventFilter === "settlement" && !event.event_type.includes("settlement")) return false;
        if (eventFilter === "foreclosed" && event.event_type !== "loan_foreclosed") return false;
        if (eventFilter === "completed" && event.event_type !== "loan_completed") return false;
        if (eventFilter === "overdue" && event.event_type !== "emi_overdue") return false;
      }

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          event.title.toLowerCase().includes(term) ||
          event.description.toLowerCase().includes(term) ||
          event.loan_id.toLowerCase().includes(term) ||
          event.user_id.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [allEvents, eventFilter, searchTerm]);

  // Filter loans for table
  const filteredLoans = useMemo(() => {
    if (!loansWithUsers) return [];

    return loansWithUsers.filter((loan) => {
      // Status filter
      if (statusFilter !== "all" && loan.status !== statusFilter) return false;

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          loan.loan_number?.toLowerCase().includes(term) ||
          loan.profiles?.email?.toLowerCase().includes(term) ||
          loan.profiles?.full_name?.toLowerCase().includes(term) ||
          loan.id.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [loansWithUsers, statusFilter, searchTerm]);

  // Export to CSV
  const handleExport = () => {
    if (!filteredEvents || filteredEvents.length === 0) return;

    const headers = [
      "Date",
      "Event Type",
      "Title",
      "Description",
      "Amount BSK",
      "Loan ID",
      "User ID",
    ];

    const rows = filteredEvents.map((e) => [
      format(new Date(e.created_at), "yyyy-MM-dd HH:mm:ss"),
      e.event_type,
      e.title,
      e.description,
      e.amount_bsk?.toString() || "",
      e.loan_id,
      e.user_id,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loan-audit-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
      case "in_arrears":
        return "bg-success/10 text-success border-success/20";
      case "closed":
        return "bg-primary/10 text-primary border-primary/20";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "pending":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-muted/10 text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="space-y-3 px-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[hsl(0_0%_98%)]">
              Loan Audit & History
            </h1>
            <p className="text-sm text-[hsl(220_9%_65%)]">
              Complete timeline of all loan events, settlements, and foreclosures
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <CleanGrid cols={2} gap="sm" className="px-4">
        <CleanMetricCard
          label="Total Loans"
          value={String(stats?.total_loans || 0)}
          icon={Landmark}
        />
        <CleanMetricCard
          label="Active"
          value={String(stats?.active || 0)}
          icon={Clock}
        />
        <CleanMetricCard
          label="Completed"
          value={String(stats?.completed || 0)}
          icon={CheckCircle}
        />
        <CleanMetricCard
          label="Foreclosed"
          value={String(stats?.foreclosed || 0)}
          icon={XCircle}
        />
      </CleanGrid>

      {/* Financial Summary */}
      <div className="px-4">
        <CleanCard padding="md">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Total Principal</p>
              <p className="text-lg font-bold font-mono">
                {(stats?.total_principal_bsk || 0).toLocaleString()} BSK
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="text-lg font-bold font-mono text-success">
                {(stats?.total_paid_bsk || 0).toLocaleString()} BSK
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-lg font-bold font-mono text-warning">
                {(stats?.total_outstanding_bsk || 0).toLocaleString()} BSK
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Forfeited</p>
              <p className="text-lg font-bold font-mono text-destructive">
                {(stats?.total_forfeited_bsk || 0).toLocaleString()} BSK
              </p>
            </div>
          </div>
        </CleanCard>
      </div>

      {/* Main Content */}
      <div className="px-4">
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
            <TabsTrigger value="loans">All Loans</TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search events, loans, users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={eventFilter} onValueChange={(v) => setEventFilter(v as EventFilter)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="emi_paid">EMI Payments</SelectItem>
                  <SelectItem value="settlement">Settlements</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="foreclosed">Foreclosed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Event Count */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Showing {filteredEvents.length} events
              </span>
            </div>

            {/* Timeline */}
            <CleanCard padding="md" className="max-h-[600px] overflow-y-auto">
              <LoanActivityTimeline
                events={filteredEvents}
                isLoading={eventsLoading}
                showLoanNumber
              />
            </CleanCard>
          </TabsContent>

          {/* Loans Tab */}
          <TabsContent value="loans" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by loan #, email, name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Loans List */}
            <div className="space-y-2">
              {filteredLoans.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No loans found"
                  description="No loans match your current filters."
                />
              ) : (
                filteredLoans.map((loan) => (
                  <CleanCard
                    key={loan.id}
                    padding="md"
                    className="cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => {
                      setSelectedUserId(loan.user_id);
                      setUserDetailOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {loan.profiles?.email || loan.user_id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            #{loan.loan_number || loan.id.slice(0, 8)} •{" "}
                            {format(new Date(loan.created_at), "dd MMM yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-mono font-medium">
                            {Number(loan.principal_bsk).toFixed(0)} BSK
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Paid: {Number(loan.paid_bsk).toFixed(0)}
                          </p>
                        </div>
                        <Badge variant="outline" className={getStatusBadgeClass(loan.status)}>
                          {loan.status}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CleanCard>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* User Detail Sheet */}
      <Sheet open={userDetailOpen} onOpenChange={setUserDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              User Loan History
            </SheetTitle>
            <SheetDescription>
              Complete timeline for user {selectedUserId?.slice(0, 8)}...
            </SheetDescription>
          </SheetHeader>

          <Separator className="my-4" />

          <ScrollArea className="h-[calc(100vh-200px)]">
            <LoanActivityTimeline
              events={userEvents || []}
              isLoading={userEventsLoading}
              showLoanNumber
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
