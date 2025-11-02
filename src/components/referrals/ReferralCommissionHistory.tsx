import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useReferralCommissionHistory } from '@/hooks/useReferralCommissionHistory';
import { Loader2, TrendingUp, Users, Award, Calendar, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

export function ReferralCommissionHistory() {
  const { data, isLoading } = useReferralCommissionHistory();
  const [activeTab, setActiveTab] = useState<string>('all');

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

  const getFilteredEntries = () => {
    if (activeTab === 'all') return entries;
    if (activeTab === 'direct') return stats.commissionsByType.direct_commission;
    if (activeTab === 'team') return stats.commissionsByType.team_income;
    if (activeTab === 'vip') return stats.commissionsByType.vip_milestone;
    return entries;
  };

  const filteredEntries = getFilteredEntries();

  return (
    <div className="space-y-6">
      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-green-200 bg-gradient-to-br from-green-50 via-green-50/50 to-background hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setActiveTab('direct')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
                  <TrendingUp className="w-7 h-7 text-green-600" />
                </div>
                <Badge className="bg-green-600 text-white">
                  {stats.commissionsByType.direct_commission.length}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Direct Commission</p>
              <p className="text-3xl font-bold text-green-600 mb-1">
                {(stats.directCommissionTotal || 0).toFixed(0)} BSK
              </p>
              <p className="text-xs text-muted-foreground">10% on direct referral badges</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 via-blue-50/50 to-background hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setActiveTab('team')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                  <Users className="w-7 h-7 text-blue-600" />
                </div>
                <Badge className="bg-blue-600 text-white">
                  {stats.commissionsByType.team_income.length}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">50-Level Team</p>
              <p className="text-3xl font-bold text-blue-600 mb-1">
                {(stats.teamIncomeTotal || 0).toFixed(0)} BSK
              </p>
              <p className="text-xs text-muted-foreground">L2-L50 network earnings</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 via-purple-50/50 to-background hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setActiveTab('vip')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                  <Award className="w-7 h-7 text-purple-600" />
                </div>
                <Badge className="bg-purple-600 text-white">
                  {stats.commissionsByType.vip_milestone.length}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">VIP Milestones</p>
              <p className="text-3xl font-bold text-purple-600 mb-1">
                {(stats.vipMilestoneTotal || 0).toFixed(0)} BSK
              </p>
              <p className="text-xs text-muted-foreground">10/50/100/250/500 VIPs</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Calendar className="w-7 h-7 text-primary" />
                </div>
                <Badge variant="outline" className="border-primary text-primary">
                  Total
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
              <p className="text-3xl font-bold mb-1">{stats.totalEarned.toFixed(0)} BSK</p>
              <p className="text-xs text-muted-foreground">
                From {stats.activeLevels} active level{stats.activeLevels !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabbed View */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="direct">Direct</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="vip">VIP</TabsTrigger>
          </TabsList>
          <Badge variant="outline" className="ml-4">
            <Filter className="w-3 h-3 mr-1" />
            {filteredEntries.length} transactions
          </Badge>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          {filteredEntries.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No commissions in this category yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === 'all' && 'All Commission History'}
                  {activeTab === 'direct' && 'Direct Commission History'}
                  {activeTab === 'team' && '50-Level Team Commission History'}
                  {activeTab === 'vip' && 'VIP Milestone History'}
                </CardTitle>
                <CardDescription>
                  {activeTab === 'all' && 'Complete commission breakdown across all categories'}
                  {activeTab === 'direct' && '10% earnings from your direct referrals badge purchases'}
                  {activeTab === 'team' && 'Earnings from your 50-level team network (L2-L50)'}
                  {activeTab === 'vip' && 'Milestone rewards for building your VIP team'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredEntries.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-background rounded-lg border hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {/* Type Badge */}
                        <div>
                          {entry.commission_type === 'direct_commission' && (
                            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                              <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                          )}
                          {entry.commission_type === 'team_income' && (
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                              <Users className="w-6 h-6 text-blue-600" />
                            </div>
                          )}
                          {entry.commission_type === 'vip_milestone' && (
                            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                              <Award className="w-6 h-6 text-purple-600" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {entry.commission_type === 'direct_commission' && (
                              <Badge className="bg-green-600 text-white">
                                💰 Direct 10%
                              </Badge>
                            )}
                            {entry.commission_type === 'team_income' && (
                              <Badge className="bg-blue-600 text-white">
                                🌳 Level {entry.level}
                              </Badge>
                            )}
                            {entry.commission_type === 'vip_milestone' && (
                              <Badge className="bg-purple-600 text-white">
                                🎁 VIP Milestone
                              </Badge>
                            )}
                            {entry.payer_badge && (
                              <Badge variant="secondary" className="text-xs">
                                {entry.payer_badge}
                              </Badge>
                            )}
                          </div>
                          <p className="font-semibold">{entry.payer_display_name}</p>
                          <p className="text-sm text-muted-foreground">
                            @{entry.payer_username} • {entry.event_type}
                          </p>
                        </div>

                        {/* Amount */}
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            +{entry.bsk_amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">BSK</p>
                        </div>

                        {/* Metadata */}
                        <div className="text-right min-w-[120px]">
                          <p className="text-sm font-medium mb-1">
                            {format(new Date(entry.created_at), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground mb-1">
                            {format(new Date(entry.created_at), 'h:mm a')}
                          </p>
                          <Badge
                            variant={entry.destination === 'withdrawable' ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {entry.destination === 'withdrawable' ? '📥 Withdrawable' : '🔒 Holding'}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Level-by-Level Breakdown (only show in 'all' tab) */}
      {activeTab === 'all' && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Earnings by Referral Level
            </CardTitle>
            <CardDescription>
              Detailed commission breakdown across your 50-level referral network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {stats.levelSummaries.map((level, index) => {
                const levelEntries = entries.filter(e => e.level === level.level);
                
                return (
                  <AccordionItem key={level.level} value={`level-${level.level}`}>
                    <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-lg">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4">
                          <Badge 
                            variant="outline" 
                            className={`min-w-[80px] ${
                              level.level === 1 
                                ? 'border-green-500 text-green-700 bg-green-50' 
                                : 'border-blue-500 text-blue-700 bg-blue-50'
                            }`}
                          >
                            Level {level.level}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{level.total_people} member{level.total_people !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className="text-lg font-bold text-primary">
                            {level.total_earned.toFixed(2)} BSK
                          </span>
                          {level.latest_commission && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span className="text-xs">
                                {format(new Date(level.latest_commission), 'MMM d, yyyy')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2 px-4">
                        {levelEntries.map((entry, entryIndex) => (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: entryIndex * 0.05 }}
                            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  {entry.commission_type === 'direct_commission' && (
                                    <Badge className="bg-green-600 text-white">
                                      💰 10% Direct
                                    </Badge>
                                  )}
                                  {entry.commission_type === 'team_income' && (
                                    <Badge className="bg-blue-600 text-white">
                                      🌳 L{entry.level} Team
                                    </Badge>
                                  )}
                                  {entry.commission_type === 'vip_milestone' && (
                                    <Badge className="bg-purple-600 text-white">
                                      🎁 VIP Milestone
                                    </Badge>
                                  )}
                                </div>
                                <p className="font-semibold">{entry.payer_display_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  @{entry.payer_username}
                                  {entry.payer_badge && ` • ${entry.payer_badge}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-green-600">
                                +{entry.bsk_amount.toFixed(2)} BSK
                              </p>
                              <div className="flex items-center gap-2 justify-end mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                                </span>
                                <Badge
                                  variant={entry.destination === 'withdrawable' ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  {entry.destination === 'withdrawable' ? '📥 W' : '🔒 H'}
                                </Badge>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
