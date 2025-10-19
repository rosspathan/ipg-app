import { useState } from "react";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Search, Calendar as CalendarIcon, Download, X } from "lucide-react";
import { format } from "date-fns";
import { exportToCSV, exportToExcel, flattenForExport } from "@/utils/export";
import { useToast } from "@/hooks/use-toast";

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string | undefined>();
  const [resourceType, setResourceType] = useState<string | undefined>();
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const { data, isLoading } = useAuditLogs({
    search,
    action,
    resourceType,
    dateFrom,
    dateTo,
    page,
    limit: 50,
  });

  const handleExportCSV = () => {
    if (!data?.logs || data.logs.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "No audit logs to export",
      });
      return;
    }

    try {
      const flatData = flattenForExport(data.logs);
      exportToCSV(flatData, "audit_logs");
      toast({
        title: "Export Successful",
        description: "Audit logs exported to CSV",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export audit logs",
      });
    }
  };

  const handleExportExcel = () => {
    if (!data?.logs || data.logs.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "No audit logs to export",
      });
      return;
    }

    try {
      const flatData = flattenForExport(data.logs);
      exportToExcel(flatData, "audit_logs");
      toast({
        title: "Export Successful",
        description: "Audit logs exported to Excel",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export audit logs",
      });
    }
  };

  const clearFilters = () => {
    setSearch("");
    setAction(undefined);
    setResourceType(undefined);
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);
  };

  const hasFilters = search || action || resourceType || dateFrom || dateTo;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Audit Logs</h1>
        <p className="text-muted-foreground">System activity and change history</p>
      </div>

      <CleanCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Filters</h3>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search actions, resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="profile_updated">Profile Updated</SelectItem>
                <SelectItem value="profile_created">Profile Created</SelectItem>
                <SelectItem value="wallet_created">Wallet Created</SelectItem>
              </SelectContent>
            </Select>

            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger>
                <SelectValue placeholder="All Resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="profiles">Profiles</SelectItem>
                <SelectItem value="user_wallets">Wallets</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dateFrom ? format(dateFrom, "PP") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dateTo ? format(dateTo, "PP") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>
      </CleanCard>

      <CleanCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Activity Log</h3>
              <p className="text-sm text-muted-foreground">
                {data?.total || 0} total entries
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading audit logs...
            </div>
          ) : !data?.logs || data.logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {data.logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{log.action}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {log.resource_type}
                          </span>
                        </div>
                        <p className="text-sm font-medium">
                          Resource ID: {log.resource_id}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(log.created_at), "PPpp")}
                        </p>
                      </div>
                      {(log.old_values || log.new_values) && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-primary hover:underline">
                            View Changes
                          </summary>
                          <div className="mt-2 space-y-2 p-2 bg-muted rounded">
                            {log.old_values && (
                              <div>
                                <p className="font-medium">Before:</p>
                                <pre className="text-xs overflow-auto">
                                  {JSON.stringify(log.old_values, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div>
                                <p className="font-medium">After:</p>
                                <pre className="text-xs overflow-auto">
                                  {JSON.stringify(log.new_values, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {data && data.pages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {data.pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </CleanCard>
    </div>
  );
}
