import { useState } from "react";
import { ArrowLeft, Download, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { format } from "date-fns";
import { BadgeMiniCard } from "@/components/badges/BadgeMiniCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function BadgeHistoryScreen() {
  const navigate = useNavigate();
  const { user } = useAuthUser();

  const { data: badgeHistory, isLoading } = useQuery({
    queryKey: ['badge-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('badge_qualification_events')
        .select(`
          *,
          badge_thresholds (
            badge_name,
            bsk_threshold,
            unlock_levels,
            bonus_bsk_holding
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    console.log("Export to PDF");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/badges')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Badge History</h1>
            <p className="text-sm text-muted-foreground">Your badge purchase timeline</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExportPDF}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {badgeHistory && badgeHistory.length > 0 ? (
          badgeHistory.map((event, index) => {
            const badgeData = event.badge_thresholds as any;
            return (
              <div key={event.id} className="relative">
                {/* Timeline line */}
                {index !== badgeHistory.length - 1 && (
                  <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-border" />
                )}
                
                <div className="flex gap-4">
                  {/* Date indicator */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary z-10">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                  </div>

                  {/* Event card */}
                  <div className="flex-1 pb-8">
                    <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(event.created_at), 'PPP')}
                        </span>
                        <span className="text-sm font-medium text-primary">
                          {event.qualification_type === 'purchase' ? 'Purchased' : 'Qualified'}
                        </span>
                      </div>
                      
                      <BadgeMiniCard badge={badgeData?.badge_name || 'Unknown'} />
                      
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                        <div>
                          <p className="text-xs text-muted-foreground">Amount</p>
                          <p className="font-semibold">{event.qualifying_amount?.toLocaleString() || 0} BSK</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Unlock Levels</p>
                          <p className="font-semibold">{badgeData?.unlock_levels || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 rounded-xl bg-card border border-border">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No badge history yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/app/badges')}
            >
              Explore Badges
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
