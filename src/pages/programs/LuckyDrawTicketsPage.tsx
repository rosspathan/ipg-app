import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function LuckyDrawTicketsPage() {
  const { user } = useAuthUser();
  const navigate = useNavigate();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["my-lucky-draw-tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lucky_draw_tickets")
        .select(`
          id,
          ticket_number,
          status,
          bsk_paid,
          prize_amount,
          created_at,
          config_id,
          draw_templates (
            title,
            ticket_price_bsk,
            pool_size
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-lg" />
            <div className="h-24 bg-muted rounded-lg" />
            <div className="h-24 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const pendingTickets = tickets?.filter(t => t.status === 'pending') || [];
  const wonTickets = tickets?.filter(t => t.status === 'won') || [];
  const lostTickets = tickets?.filter(t => t.status === 'lost') || [];

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Tickets</h1>
            <p className="text-sm text-muted-foreground">
              View all your lucky draw entries
            </p>
          </div>
          <Button onClick={() => navigate('/app/programs/lucky-draw')}>
            Buy More
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-warning" />
                <div className="text-2xl font-bold">{pendingTickets.length}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Trophy className="h-6 w-6 mx-auto mb-2 text-success" />
                <div className="text-2xl font-bold">{wonTickets.length}</div>
                <div className="text-xs text-muted-foreground">Won</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Ticket className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{tickets?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tickets List */}
        {pendingTickets.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold">Pending Draws</h2>
            {pendingTickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                        <Ticket className="h-6 w-6 text-warning" />
                      </div>
                      <div>
                        <div className="font-semibold">{ticket.ticket_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {(ticket.draw_templates as any)?.title || 'Lucky Draw'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {wonTickets.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold">Winning Tickets</h2>
            {wonTickets.map((ticket) => (
              <Card key={ticket.id} className="border-success">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                        <Trophy className="h-6 w-6 text-success" />
                      </div>
                      <div>
                        <div className="font-semibold">{ticket.ticket_number}</div>
                        <div className="text-sm text-muted-foreground">
                          Won {ticket.prize_amount} BSK
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-success">Won</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {lostTickets.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold">Past Tickets</h2>
            {lostTickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <Ticket className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold">{ticket.ticket_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {(ticket.draw_templates as any)?.title || 'Lucky Draw'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">Completed</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!tickets || tickets.length === 0 ? (
          <Card className="p-12 text-center">
            <Ticket className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Tickets Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Purchase tickets to enter lucky draws and win prizes
            </p>
            <Button onClick={() => navigate('/app/programs/lucky-draw')}>
              Browse Draws
            </Button>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
