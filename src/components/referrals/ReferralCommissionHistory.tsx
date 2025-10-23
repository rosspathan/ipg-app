import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useReferralCommissionHistory } from '@/hooks/useReferralCommissionHistory';
import { Loader2, TrendingUp, Users, Award, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';

export function ReferralCommissionHistory() {
  const { data, isLoading } = useReferralCommissionHistory();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No commission history yet. Start referring to earn BSK!</p>
        </CardContent>
      </Card>
    );
  }

  const { entries, stats } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold">{stats.totalEarned.toFixed(2)} BSK</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Levels</p>
                <p className="text-2xl font-bold">{stats.activeLevels}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Level</p>
                <p className="text-2xl font-bold">Level {stats.topLevel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{stats.thisMonthEarnings.toFixed(2)} BSK</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level-by-Level Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings by Level</CardTitle>
          <CardDescription>Commission breakdown across all referral levels</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {stats.levelSummaries.map((level) => {
              const levelEntries = entries.filter(e => e.level === level.level);
              
              return (
                <AccordionItem key={level.level} value={`level-${level.level}`}>
                  <AccordionTrigger>
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="min-w-20">Level {level.level}</Badge>
                        <span className="text-sm text-muted-foreground">{level.total_people} people</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold">{level.total_earned.toFixed(2)} BSK</span>
                        {level.latest_commission && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(level.latest_commission), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {levelEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium">{entry.payer_display_name}</p>
                              <p className="text-sm text-muted-foreground">
                                @{entry.payer_username} • {entry.event_type}
                              </p>
                            </div>
                            {entry.payer_badge && (
                              <Badge variant="secondary">{entry.payer_badge}</Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">+{entry.bsk_amount.toFixed(2)} BSK</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                              </span>
                              <Badge variant={entry.destination === 'withdrawable' ? 'default' : 'outline'} className="text-xs">
                                {entry.destination === 'withdrawable' ? '📥 W' : '🔒 H'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
