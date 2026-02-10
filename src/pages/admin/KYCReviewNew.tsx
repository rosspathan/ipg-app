import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminKYC, KYCStatusFilter, KYCSubmissionWithUser } from '@/hooks/useAdminKYC';
import { KYCSubmissionList } from '@/components/admin/kyc/KYCSubmissionList';
import { KYCReviewPanel } from '@/components/admin/kyc/KYCReviewPanel';
import { KYCStatsDashboard } from '@/components/admin/kyc/KYCStatsDashboard';
import { Search, FileText, Shield, CheckCircle, RefreshCw } from 'lucide-react';

export default function KYCReviewNew() {
  const {
    submissions,
    stats,
    loading,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    approveSubmission,
    rejectSubmission,
    refetch,
  } = useAdminKYC();

  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmissionWithUser | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-update selected submission when data refreshes
  useEffect(() => {
    if (selectedSubmission) {
      const updated = submissions.find(s => s.id === selectedSubmission.id);
      if (updated) {
        setSelectedSubmission(updated);
      } else {
        setSelectedSubmission(null);
      }
    }
  }, [submissions, selectedSubmission?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 p-4">
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </Card>
          <Card className="lg:col-span-2 p-6">
            <Skeleton className="h-64 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">KYC Review Dashboard</h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              <Shield className="h-3 w-3 mr-1" />
              Exchange-Grade
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Review and approve user identity verification submissions
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Dashboard */}
      <KYCStatsDashboard onRefresh={refetch} />

      {/* Filters */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4 -mt-2 pt-2 border-b">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs 
            value={statusFilter} 
            onValueChange={(v) => setStatusFilter(v as KYCStatusFilter)} 
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-4 w-full sm:w-auto">
              <TabsTrigger value="all" className="relative">
                All
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                  {stats.total}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="relative">
                Pending
                {stats.pending > 0 && (
                  <Badge className="ml-1.5 h-5 px-1.5 text-[10px] bg-amber-500">
                    {stats.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px] bg-emerald-500/20 text-emerald-600">
                  {stats.approved}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px] bg-red-500/20 text-red-600">
                  {stats.rejected}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions List */}
        <Card className="lg:col-span-1 p-4 max-h-[calc(100vh-380px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Submissions</h2>
            <Badge variant="outline">
              {submissions.length} {submissions.length === 1 ? 'user' : 'users'}
            </Badge>
          </div>
          
          {submissions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground font-medium mb-1">No submissions found</p>
              <p className="text-sm text-muted-foreground">
                {statusFilter !== 'all' 
                  ? `No ${statusFilter} submissions. Try "All" filter.` 
                  : searchQuery 
                    ? 'No results for your search' 
                    : 'New KYC submissions will appear here'}
              </p>
            </div>
          ) : (
            <KYCSubmissionList
              submissions={submissions}
              selectedId={selectedSubmission?.id}
              onSelect={setSelectedSubmission}
            />
          )}
        </Card>

        {/* Review Panel */}
        <div className="lg:col-span-2">
          {selectedSubmission ? (
            <KYCReviewPanel
              submission={selectedSubmission}
              onApprove={async (notes) => {
                await approveSubmission(selectedSubmission.id, notes);
                setSelectedSubmission(null);
              }}
              onReject={async (reason) => {
                await rejectSubmission(selectedSubmission.id, reason);
                setSelectedSubmission(null);
              }}
            />
          ) : (
            <Card className="p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
              <div className="rounded-full bg-muted p-6 mb-4">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium mb-1">Select a submission to review</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Choose a KYC submission from the list to view details and approve or reject
              </p>
              {stats.pending > 0 && (
                <div className="mt-6 flex items-center gap-2 text-amber-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {stats.pending} submission{stats.pending === 1 ? '' : 's'} awaiting review
                  </span>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
