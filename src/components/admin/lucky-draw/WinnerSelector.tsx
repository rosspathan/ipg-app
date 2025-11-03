import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export function WinnerSelector() {
  const [selectedDraw, setSelectedDraw] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: openDraws, isLoading } = useQuery({
    queryKey: ['open-draws'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('draw_configs')
        .select('*, draw_tickets(count)')
        .eq('state', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const executeDraw = useMutation({
    mutationFn: async (drawId: string) => {
      // Call edge function to execute draw with provable fairness
      const { data, error } = await supabase.functions.invoke('execute-lucky-draw', {
        body: { draw_id: drawId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['open-draws'] });
      queryClient.invalidateQueries({ queryKey: ['draw-analytics'] });
      
      toast.success('Draw executed successfully!', {
        description: `Winners have been selected and notified.`
      });
    },
    onError: (error: any) => {
      toast.error('Failed to execute draw', {
        description: error.message
      });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Winners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Execute Draw & Select Winners
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!openDraws || openDraws.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No open draws available</p>
          </div>
        ) : (
          openDraws.map((draw: any) => (
            <div 
              key={draw.id} 
              className="border rounded-lg p-4 space-y-3 hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold">{draw.title}</h4>
                  <p className="text-sm text-muted-foreground">{draw.description}</p>
                </div>
                <Badge variant={draw.current_participants >= draw.pool_size ? "default" : "secondary"}>
                  {draw.state}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Participants</p>
                  <p className="font-semibold">{draw.current_participants} / {draw.pool_size}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ticket Price</p>
                  <p className="font-semibold">{draw.ticket_price_bsk} BSK</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prize Pool</p>
                  <p className="font-semibold">
                    {(draw.ticket_price_bsk * draw.current_participants * (1 - draw.fee_percent / 100)).toFixed(0)} BSK
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => executeDraw.mutate(draw.id)}
                  disabled={
                    executeDraw.isPending || 
                    draw.current_participants < draw.min_tickets_for_scheduled
                  }
                  className="flex-1"
                >
                  {executeDraw.isPending && selectedDraw === draw.id ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Execute Draw
                    </>
                  )}
                </Button>
                
                {draw.current_participants < draw.min_tickets_for_scheduled && (
                  <p className="text-xs text-muted-foreground flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Min {draw.min_tickets_for_scheduled} participants required
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
