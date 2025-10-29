import { useState } from 'react';
import { format } from 'date-fns';
import { Users, TrendingUp, Award, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    return `${amount.toFixed(2)} BSK`;
  };

  // Get unique levels and sort them
  const levels = [...new Set(data.members.map(m => m.level))].sort((a, b) => a - b);

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

      {/* Level Tabs and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Structure by Level</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedLevel.toString()} onValueChange={(v) => setSelectedLevel(Number(v))}>
            <TabsList className="mb-4">
              {levels.map(level => {
                const levelData = data.levelStats.find(ls => ls.level === level);
                return (
                  <TabsTrigger key={level} value={level.toString()}>
                    Level {level}
                    <Badge variant="secondary" className="ml-2">
                      {levelData?.member_count || 0}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {levels.map(level => (
              <TabsContent key={level} value={level.toString()}>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NAME</TableHead>
                        <TableHead>DOJ</TableHead>
                        <TableHead>SPONSOR ID</TableHead>
                        <TableHead className="text-right">Package Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {membersForLevel.length > 0 ? (
                        membersForLevel.map((member) => (
                          <TableRow key={member.user_id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{member.display_name}</span>
                                <span className="text-sm text-muted-foreground">
                                  @{member.username}
                                </span>
                                {member.current_badge && (
                                  <Badge variant="outline" className="mt-1 w-fit">
                                    {member.current_badge}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(member.join_date)}</TableCell>
                            <TableCell>
                              {member.sponsor_username ? (
                                <span className="text-primary">@{member.sponsor_username}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(member.package_cost)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No members at this level yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
