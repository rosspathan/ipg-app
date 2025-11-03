import { useState } from "react";
import { useUnifiedProgramHistory } from "@/hooks/useUnifiedProgramHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Search, Filter, Trophy, Coins, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

interface ProgramParticipationHistoryProps {
  userId?: string;
  compact?: boolean;
}

export const ProgramParticipationHistory = ({ userId, compact = false }: ProgramParticipationHistoryProps) => {
  const {
    participations,
    totalCount,
    statistics,
    isLoading,
    filters,
    setFilters,
    page,
    setPage,
    totalPages,
    exportToCSV,
  } = useUnifiedProgramHistory(userId);

  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = () => {
    setFilters({ ...filters, searchTerm });
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (participations.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Program Activity Yet</h3>
          <p className="text-sm text-muted-foreground">
            Start participating in programs to see your activity here
          </p>
        </CardContent>
      </Card>
    );
  }

  const limitedParticipations = compact ? participations.slice(0, 5) : participations;

  return (
    <div className="space-y-4">
      {/* Statistics Cards - Only show when not compact */}
      {!compact && statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold">{statistics.totalParticipations}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-success" />
                <span className="text-sm text-muted-foreground">Earned</span>
              </div>
              <p className="text-2xl font-bold text-success">{statistics.totalEarned.toFixed(2)} BSK</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Paid</span>
              </div>
              <p className="text-2xl font-bold text-destructive">{statistics.totalPaid.toFixed(2)} BSK</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Active</span>
              </div>
              <p className="text-2xl font-bold">{statistics.activeCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter Bar - Only show when not compact */}
      {!compact && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Search by program type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} size="icon" variant="outline">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
                <Button onClick={exportToCSV} variant="outline" size="icon">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participation List */}
      <div className="space-y-3">
        {limitedParticipations.map((participation) => (
          <Card key={participation.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-primary flex-shrink-0" />
                    <h4 className="font-semibold truncate">
                      {participation.program_modules?.name || participation.module_id}
                    </h4>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Badge variant="outline">{participation.participation_type}</Badge>
                    {participation.outcome && (
                      <Badge variant={participation.outcome === 'success' ? 'default' : 'secondary'}>
                        {participation.outcome}
                      </Badge>
                    )}
                    <Badge variant={participation.completed_at ? 'default' : 'secondary'}>
                      {participation.completed_at ? 'Completed' : 'Active'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    {participation.amount_earned && participation.amount_earned > 0 && (
                      <span className="text-success font-medium">
                        +{participation.amount_earned} BSK
                      </span>
                    )}
                    {participation.amount_paid && participation.amount_paid > 0 && (
                      <span className="text-destructive font-medium">
                        -{participation.amount_paid} BSK
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(participation.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination - Only show when not compact */}
      {!compact && totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
