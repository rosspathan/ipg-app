import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  Ticket,
  Trophy,
  Users,
  Clock,
  DollarSign,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BacklinkBar } from "@/components/programs-pro/BacklinkBar";
import { toast } from "sonner";

export default function LuckyDrawPage() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const [buyDialog, setBuyDialog] = useState(false);
  const [selectedDraw, setSelectedDraw] = useState<any>(null);
  const [ticketCount, setTicketCount] = useState(1);

  // Fetch active draws
  const { data: draws, isLoading } = useQuery({
    queryKey: ["lucky-draws"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draw_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user tickets
  const { data: userTickets } = useQuery({
    queryKey: ["user-tickets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from("lucky_draw_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleBuyTickets = (draw: any) => {
    setSelectedDraw(draw);
    setTicketCount(1);
    setBuyDialog(true);
  };

  const totalCost = selectedDraw
    ? (selectedDraw.ticket_price * ticketCount).toFixed(2)
    : "0.00";

  const handlePurchase = async () => {
    if (!user || !selectedDraw) return;

    try {
      toast.success(`Purchased ${ticketCount} ticket(s)!`);
      setBuyDialog(false);
      queryClient.invalidateQueries({ queryKey: ["user-tickets"] });
    } catch (error) {
      toast.error("Failed to purchase tickets");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-24">
      {/* Backlink */}
      <BacklinkBar programName="Lucky Draw" />
      
      <div className="p-4 space-y-4">
        {/* Subtitle */}
        <p className="text-sm text-muted-foreground mb-4">
          Win big prizes with lucky draw tickets
        </p>
        {/* User Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Ticket className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">My Tickets</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {userTickets?.length || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">Active Draws</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {draws?.length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Draws */}
        <div className="space-y-3">
          <h2 className="text-lg font-heading font-bold text-foreground">
            Active Draws
          </h2>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading draws...
            </div>
          ) : draws && draws.length > 0 ? (
            draws.map((draw: any) => {
              const spacesLeft = draw.pool_size - draw.current_participants;
              const progress = (draw.current_participants / draw.pool_size) * 100;

              return (
                <Card
                  key={draw.id}
                  className="bg-gradient-to-br from-card to-card/50 border-border/50"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-warning" />
                          {draw.title || "Lucky Draw"}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {draw.description || "Win amazing prizes!"}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Prize Pool */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">1st Prize</p>
                        <p className="text-sm font-bold text-warning">
                          {draw.first_place_prize} BSK
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">2nd Prize</p>
                        <p className="text-sm font-bold text-primary">
                          {draw.second_place_prize} BSK
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">3rd Prize</p>
                        <p className="text-sm font-bold text-success">
                          {draw.third_place_prize} BSK
                        </p>
                      </div>
                    </div>

                    {/* Pool Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Participants</span>
                        </div>
                        <span className="font-medium text-foreground">
                          {draw.current_participants} / {draw.pool_size}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-success transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {spacesLeft <= 10 && (
                        <p className="text-xs text-warning">
                          Only {spacesLeft} spots left!
                        </p>
                      )}
                    </div>

                    {/* Ticket Info */}
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span className="text-sm text-foreground">Ticket Price</span>
                      </div>
                      <span className="font-bold text-primary">
                        {draw.ticket_price} INR
                      </span>
                    </div>

                    <Button
                      onClick={() => handleBuyTickets(draw)}
                      className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80"
                      disabled={spacesLeft === 0}
                    >
                      <Plus className="w-4 h-4" />
                      {spacesLeft === 0 ? "Pool Full" : "Buy Tickets"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No active draws right now</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back soon for new draws!
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* My Tickets */}
        {userTickets && userTickets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">My Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {userTickets.slice(0, 5).map((ticket: any) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Ticket className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground font-mono">
                        {ticket.ticket_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      ticket.status === "won"
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-muted/10 text-muted-foreground"
                    }
                  >
                    {ticket.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Buy Tickets Dialog */}
      <Dialog open={buyDialog} onOpenChange={setBuyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy Lucky Draw Tickets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Number of Tickets
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={ticketCount}
                onChange={(e) => setTicketCount(Number(e.target.value))}
              />
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ticket Price</span>
                <span className="font-medium">
                  {selectedDraw?.ticket_price} INR
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Quantity</span>
                <span className="font-medium">{ticketCount}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Total</span>
                <span className="text-lg font-bold text-primary">
                  {totalCost} INR
                </span>
              </div>
            </div>

            <Button onClick={handlePurchase} className="w-full bg-primary">
              Confirm Purchase
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
