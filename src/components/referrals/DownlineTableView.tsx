import { useState } from 'react';
import { format } from 'date-fns';
import { Users, TrendingUp, Award, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useDownlineTree } from '@/hooks/useDownlineTree';
import { Loader2 } from 'lucide-react';
import { ModernLevelSelector } from './ModernLevelSelector';

export function DownlineTableView() {
  const { data, isLoading } = useDownlineTree();
  const [selectedLevel, setSelectedLevel] = useState<number>(1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.members.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            No team members yet. Share your referral code to start building your network!
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return '-';
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return `${amount.toFixed(0)} BSK`;
  };

  // Prepare level data for selector
  const levelData = data.levelStats.map((stats) => ({
    level: stats.level,
    count: stats.member_count
  })).sort((a, b) => a.level - b.level);

  // Filter members by selected level
  const membersForLevel = data.members.filter(m => m.level === selectedLevel);

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{data.totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10">
                <Award className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold">{data.activeMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Generated</p>
                <p className="text-2xl font-bold">{data.totalGenerated.toFixed(2)} BSK</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary/10">
                <Layers className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deepest Level</p>
                <p className="text-2xl font-bold">{data.deepestLevel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Selector and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Structure by Level</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Modern Level Selector */}
          <ModernLevelSelector
            levels={levelData}
            selectedLevel={selectedLevel}
            onLevelChange={setSelectedLevel}
          />

          {/* Table */}
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">NAME</TableHead>
                  <TableHead className="font-semibold">DOJ</TableHead>
                  <TableHead className="font-semibold">SPONSOR ID</TableHead>
                  <TableHead className="text-right font-semibold">Package Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersForLevel.length > 0 ? (
                  membersForLevel.map((member) => (
                    <TableRow 
                      key={member.user_id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-base">{member.display_name}</span>
                          <span className="text-sm text-muted-foreground">
                            @{member.username}
                          </span>
                          {member.current_badge && (
                            <Badge 
                              variant="outline" 
                              className="mt-1.5 w-fit text-xs px-2 py-0.5 border-primary/40 text-primary"
                            >
                              {member.current_badge}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-muted-foreground">
                        {formatDate(member.join_date)}
                      </TableCell>
                      <TableCell className="py-4">
                        {member.sponsor_username ? (
                          <span className="text-primary font-medium">
                            @{member.sponsor_username}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-right font-semibold text-base">
                        {formatCurrency(member.package_cost)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="w-8 h-8 opacity-50" />
                        <p className="text-sm">No members at Level {selectedLevel} yet</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
