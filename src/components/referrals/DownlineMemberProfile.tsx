import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Mail, Calendar, Award, TrendingUp, Users } from 'lucide-react';
import type { DownlineMember } from '@/hooks/useDownlineTree';

interface DownlineMemberProfileProps {
  member: DownlineMember;
  open: boolean;
  onClose: () => void;
}

export function DownlineMemberProfile({ member, open, onClose }: DownlineMemberProfileProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Team Member Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {member.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{member.display_name}</h3>
              <p className="text-muted-foreground">@{member.username}</p>
            </div>
            {member.current_badge && (
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {member.current_badge}
              </Badge>
            )}
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Position</p>
                    <p className="font-semibold">Level {member.level}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Generated for You</p>
                    <p className="font-semibold text-green-600">{member.total_generated.toFixed(2)} BSK</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {member.join_date && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Join Date</p>
                      <p className="font-semibold">
                        {format(new Date(member.join_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {member.badge_date && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Award className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Badge Purchase</p>
                      <p className="font-semibold">
                        {format(new Date(member.badge_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Contact Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{member.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              member.total_generated > 0 ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <span className="text-sm text-muted-foreground">
              {member.total_generated > 0 
                ? 'Active - Has generated commissions' 
                : member.current_badge 
                  ? 'Active - Has badge but no commissions yet'
                  : 'Inactive - No badge purchased'}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
