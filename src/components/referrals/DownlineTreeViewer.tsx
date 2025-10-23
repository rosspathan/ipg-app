import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useDownlineTree } from '@/hooks/useDownlineTree';
import { Loader2, Users, Award, TrendingUp, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import { useState } from 'react';
import { DownlineMemberProfile } from './DownlineMemberProfile';

export function DownlineTreeViewer() {
  const { data, isLoading } = useDownlineTree();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.totalMembers === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No downline members yet. Share your referral link to build your team!</p>
        </CardContent>
      </Card>
    );
  }

  const selectedMemberData = data.members.find(m => m.user_id === selectedMember);

  return (
    <>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Team Size</p>
                  <p className="text-2xl font-bold">{data.totalMembers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Award className="w-6 h-6 text-green-600" />
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
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
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
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <ChevronRight className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deepest Level</p>
                  <p className="text-2xl font-bold">Level {data.deepestLevel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Level-by-Level List */}
        <Card>
          <CardHeader>
            <CardTitle>Multi-Level Team Structure</CardTitle>
            <CardDescription>Your referral network across all {data.deepestLevel} levels</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {data.levelStats.map((levelStat) => {
                const levelMembers = data.members.filter(m => m.level === levelStat.level);
                
                return (
                  <AccordionItem key={levelStat.level} value={`level-${levelStat.level}`}>
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4">
                          <Badge 
                            variant="outline" 
                            className={`min-w-20 ${
                              levelStat.level <= 10 ? 'border-blue-500 text-blue-600' :
                              levelStat.level <= 25 ? 'border-green-500 text-green-600' :
                              levelStat.level <= 40 ? 'border-yellow-500 text-yellow-600' :
                              'border-purple-500 text-purple-600'
                            }`}
                          >
                            Level {levelStat.level}
                          </Badge>
                          <span className="text-sm font-medium">{levelStat.member_count} members</span>
                          <span className="text-sm text-muted-foreground">
                            ({levelStat.active_count} active)
                          </span>
                        </div>
                        <span className="font-semibold">{levelStat.total_generated.toFixed(2)} BSK</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {levelMembers.map((member) => (
                          <div
                            key={member.user_id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => setSelectedMember(member.user_id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-semibold text-primary">
                                  {member.display_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{member.display_name}</p>
                                <p className="text-sm text-muted-foreground">@{member.username}</p>
                              </div>
                              {member.current_badge ? (
                                <Badge variant="secondary">{member.current_badge}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">No Badge</Badge>
                              )}
                              <div className={`w-2 h-2 rounded-full ${
                                member.total_generated > 0 ? 'bg-green-500' : 'bg-gray-400'
                              }`} />
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">
                                {member.total_generated.toFixed(2)} BSK
                              </p>
                              {member.join_date && (
                                <p className="text-xs text-muted-foreground">
                                  Joined {format(new Date(member.join_date), 'MMM d, yyyy')}
                                </p>
                              )}
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

      {/* Member Profile Modal */}
      {selectedMemberData && (
        <DownlineMemberProfile
          member={selectedMemberData}
          open={!!selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  );
}
