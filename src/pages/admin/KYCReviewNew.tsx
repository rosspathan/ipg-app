import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAdminKYC, KYCStatusFilter, KYCSubmissionWithUser } from '@/hooks/useAdminKYC';
import { KYCSubmissionList } from '@/components/admin/kyc/KYCSubmissionList';
import { KYCReviewPanel } from '@/components/admin/kyc/KYCReviewPanel';
import { Search } from 'lucide-react';

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
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
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

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as KYCStatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions List */}
        <Card className="lg:col-span-1 p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
          <h2 className="font-semibold mb-4">
            Submissions ({submissions.length})
          </h2>
          <KYCSubmissionList
            submissions={submissions}
            selectedId={selectedSubmission?.id}
            onSelect={setSelectedSubmission}
          />
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
              <p className="text-muted-foreground">
                Select a submission from the list to review
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
