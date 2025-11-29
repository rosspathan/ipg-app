import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminKYC, KYCStatusFilter, KYCSubmissionWithUser } from '@/hooks/useAdminKYC';
import { KYCSubmissionList } from '@/components/admin/kyc/KYCSubmissionList';
import { KYCReviewPanel } from '@/components/admin/kyc/KYCReviewPanel';
import { KYCStatsDashboard } from '@/components/admin/kyc/KYCStatsDashboard';
import { Search, FileText } from 'lucide-react';

export default function KYCReviewNew() {
  const {
    submissions,
    loading,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    approveSubmission,
    rejectSubmission,
  } = useAdminKYC();

  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmissionWithUser | null>(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 p-4">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </Card>
          <Card className="lg:col-span-2 p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-64 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">KYC Review Dashboard</h1>
        <p className="text-muted-foreground">
          Review and approve user identity verification submissions
        </p>
      </div>

      {/* Stats Dashboard */}
      <KYCStatsDashboard />

      {/* Filters - Sticky on mobile */}
      <div className="sticky top-0 z-10 bg-background pb-4 -mt-2 pt-2">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as KYCStatusFilter)} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-5 w-full sm:w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="submitted">Submitted</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions List */}
        <Card className="lg:col-span-1 p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
          <h2 className="font-semibold mb-4">
            Submissions ({submissions.length})
          </h2>
          {submissions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground font-medium mb-1">No submissions found</p>
              <p className="text-sm text-muted-foreground">
                {statusFilter !== 'all' 
                  ? `Try switching to "All" or check other filters` 
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
              onApprove={(notes) => approveSubmission(selectedSubmission.id, notes)}
              onReject={(reason) => rejectSubmission(selectedSubmission.id, reason)}
            />
          ) : (
            <Card className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium mb-1">Select a submission to review</p>
              <p className="text-sm text-muted-foreground">
                Choose a KYC submission from the list to view details
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
