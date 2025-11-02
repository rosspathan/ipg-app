import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useVIPMilestoneHistory } from '@/hooks/useVIPMilestoneHistory';
import { Loader2, Award, TrendingUp, Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export function VIPMilestoneHistory() {
  const { data: milestones, isLoading } = useVIPMilestoneHistory();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!milestones || milestones.length === 0) {
    return (
      <Card className="border-purple-200">
        <CardContent className="p-8 text-center">
          <Award className="w-12 h-12 mx-auto mb-4 text-purple-500 opacity-50" />
          <p className="text-lg font-semibold mb-2">No VIP Milestones Yet</p>
          <p className="text-sm text-muted-foreground">
            Build your VIP team to unlock milestone rewards at 10, 50, 100, 250, and 500 VIPs!
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalRewarded = milestones.reduce((sum, m) => sum + m.bsk_rewarded, 0);
  const totalVIPs = Math.max(...milestones.map(m => m.vip_count_at_claim));

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-background">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Milestones Achieved</p>
                <p className="text-3xl font-bold text-purple-600">{milestones.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-background">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Rewarded</p>
                <p className="text-3xl font-bold text-green-600">{totalRewarded.toFixed(0)} BSK</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-background">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">VIP Team Size</p>
                <p className="text-3xl font-bold text-blue-600">{totalVIPs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            VIP Milestone Achievements
          </CardTitle>
          <CardDescription>
            Your journey through the VIP milestone rewards program
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        {/* Milestone Badge */}
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Award className="w-8 h-8 text-white" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-lg">
                            <Badge className="bg-purple-600 text-xs px-2">
                              #{milestones.length - index}
                            </Badge>
                          </div>
                        </div>

                        {/* Milestone Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-xl font-bold mb-1">
                                {milestone.milestone.vip_count_threshold} VIP Milestone
                              </h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                {milestone.milestone.reward_description || 'VIP Team Building Reward'}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-600 mb-1">
                                +{milestone.bsk_rewarded.toFixed(0)} BSK
                              </div>
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                🔒 Holding
                              </Badge>
                            </div>
                          </div>

                          {/* Stats Row */}
                          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">VIPs at Claim</p>
                              <p className="font-semibold flex items-center gap-1">
                                <Users className="w-4 h-4 text-blue-600" />
                                {milestone.vip_count_at_claim}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Reward Type</p>
                              <Badge variant="outline" className="text-xs">
                                {milestone.milestone.reward_type}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Claimed On</p>
                              <p className="text-sm font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                {milestone.claimed_at 
                                  ? format(new Date(milestone.claimed_at), 'MMM d, yyyy')
                                  : 'Processing'
                                }
                              </p>
                            </div>
                          </div>

                          {/* Value Indicator */}
                          <div className="mt-3 flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Estimated Value:</span>
                            <span className="font-semibold text-primary">
                              ₹{milestone.milestone.reward_inr_value?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Milestones Preview */}
      <Card className="border-dashed border-2 border-purple-300 bg-purple-50/30">
        <CardContent className="p-6">
          <div className="text-center">
            <Award className="w-12 h-12 mx-auto mb-3 text-purple-500" />
            <h3 className="text-lg font-semibold mb-2">Keep Building Your VIP Team!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Next milestones at {milestones.length < 1 ? '10' : milestones.length < 2 ? '50' : milestones.length < 3 ? '100' : milestones.length < 4 ? '250' : '500'} VIPs
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                Current VIP Team: {totalVIPs}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
