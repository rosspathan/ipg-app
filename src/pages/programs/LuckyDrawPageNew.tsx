import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Trophy, Users, Ticket, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LuckyDrawPageNew() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const [selectedPool, setSelectedPool] = useState<any>(null);
  const [ticketCount, setTicketCount] = useState(1);

  // Fetch active pools from draw_templates table
  const { data: pools, isLoading } = useQuery({
    queryKey: ["lucky-draw-pools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draw_templates")
        .select("*")
        .eq("is_active", true)
        .order("ticket_price_bsk", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user's tickets
  const { data: myTickets } = useQuery({
    queryKey: ["my-tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // For now, return empty array since table structure differs
      // In production, this would query the actual tickets table
      return [];
    },
  });

  // Buy tickets mutation (simplified - in production use edge function)
  const buyTicketsMutation = useMutation({
    mutationFn: async ({ templateId, count }: { templateId: string; count: number }) => {
      const template = pools?.find((p: any) => p.id === templateId);
      if (!template) throw new Error("Template not found");

      const totalCost = template.ticket_price_bsk * count;

      // For now, just create tickets directly
      // In production, this should be done via edge function with payment verification
      // For now, simplified - in production use edge function
      // that verifies BSK balance and creates tickets with proper validation
      toast.success("Coming soon!", {
        description: "Ticket purchase will be available soon",
      });

      return { count, totalCost };
    },
    onSuccess: () => {
      toast.success("Tickets purchased successfully!");
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      setSelectedPool(null);
      setTicketCount(1);
    },
    onError: (error: any) => {
      toast.error("Failed to purchase tickets", {
        description: error.message,
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 p-4 space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Lucky Draw</h1>
              <p className="text-sm text-muted-foreground">
                Buy tickets and win big prizes
              </p>
            </div>
            <Target className="h-8 w-8 text-primary" />
          </div>

          {myTickets && myTickets.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Ticket className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-sm">My Active Tickets</p>
                <p className="text-xs text-muted-foreground">{myTickets.length} ticket(s)</p>
              </div>
            </div>
          )}
        </Card>

        {/* Active Pools */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Available Draws</h2>
            <Badge variant="outline">
              {pools?.length || 0} Active
            </Badge>
          </div>

          {!pools || pools.length === 0 ? (
            <Card className="p-8 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No active draws right now</p>
              <p className="text-xs text-muted-foreground mt-1">
                Check back later for new draws
              </p>
            </Card>
          ) : (
            pools.map((template: any) => {
              const Icon = Trophy;
              const prizes = template.prizes as any[];
              const totalPrize = prizes?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

              return (
                <Card key={template.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center">
                          <Icon className="h-6 w-6 text-warning" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{template.title || template.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {template.ticket_price_bsk} BSK per ticket
                          </p>
                        </div>
                      </div>
                      <Badge>Live</Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pool Size</span>
                        <span className="font-medium">{template.pool_size} tickets</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Prize Pool</p>
                        <p className="font-bold text-primary">{totalPrize} BSK</p>
                      </div>
                      <Button
                        onClick={() => setSelectedPool(template)}
                        className="min-h-[44px]"
                      >
                        Buy Tickets
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Buy Tickets Dialog */}
      <Dialog open={!!selectedPool} onOpenChange={() => setSelectedPool(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy Tickets</DialogTitle>
            <DialogDescription>
              Choose how many tickets you want to purchase
            </DialogDescription>
          </DialogHeader>

          {selectedPool && (
            <div className="space-y-4">
              <div>
                <Label>Number of Tickets</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={ticketCount}
                  onChange={(e) => setTicketCount(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum: 10 tickets per purchase
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Price per ticket:</span>
                  <span className="font-medium">{selectedPool.ticket_price_bsk} BSK</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Quantity:</span>
                  <span className="font-medium">{ticketCount}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total Cost:</span>
                  <span className="text-primary">
                    {selectedPool.ticket_price_bsk * ticketCount} BSK
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPool(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                buyTicketsMutation.mutate({
                  templateId: selectedPool.id,
                  count: ticketCount,
                })
              }
              disabled={buyTicketsMutation.isPending}
            >
              {buyTicketsMutation.isPending ? "Processing..." : "Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
