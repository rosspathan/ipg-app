import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Gift, Trophy, Ticket, Users, Clock, Shield, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

interface DrawConfig {
  id: string;
  title: string;
  description: string;
  pool_size: number;
  ticket_price_bsk: number;
  per_user_ticket_cap: number;
  fee_percent: number;
  state: 'draft' | 'open' | 'full' | 'drawing' | 'completed' | 'expired' | 'refunding' | 'closed';
  current_participants: number;
  created_at: string;
}

interface DrawPrize {
  rank: 'first' | 'second' | 'third';
  amount_bsk: number;
}

interface DrawTicket {
  id: string;
  ticket_number: string;
  status: 'active' | 'won' | 'refunded';
  prize_rank?: 'first' | 'second' | 'third';
  prize_bsk_net?: number;
  created_at: string;
}

interface DrawResult {
  winners: any;
  proof_data: any;
  server_seed: string;
  client_seed: string;
  nonce: number;
}

const NewLuckyDraw = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [ticketCount, setTicketCount] = useState(1);
  const [drawConfig, setDrawConfig] = useState<DrawConfig | null>(null);
  const [prizes, setPrizes] = useState<DrawPrize[]>([]);
  const [userTickets, setUserTickets] = useState<DrawTicket[]>([]);
  const [drawResults, setDrawResults] = useState<DrawResult | null>(null);
  const [bskRate, setBskRate] = useState(1.0);
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => {
    loadDrawData();
  }, []);

  const loadDrawData = async () => {
    try {
      setLoading(true);
      
      // Get active draw
      const { data: draws, error: drawError } = await supabase
        .from('draw_configs')
        .select('*')
        .in('state', ['open', 'full', 'drawing', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (drawError) throw drawError;
      
      if (draws && draws.length > 0) {
        setDrawConfig(draws[0]);
        
        // Get prizes for this draw
        const { data: prizesData, error: prizesError } = await supabase
          .from('draw_prizes')
          .select('*')
          .eq('draw_id', draws[0].id)
          .order('amount_bsk', { ascending: false });

        if (prizesError) throw prizesError;
        setPrizes(prizesData || []);

        // Get user tickets if logged in
        if (user) {
          const { data: ticketsData, error: ticketsError } = await supabase
            .from('draw_tickets')
            .select('*')
            .eq('draw_id', draws[0].id)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (ticketsError) throw ticketsError;
          setUserTickets(ticketsData || []);

          // Get user BSK balance
          const { data: balanceData } = await supabase
            .from('user_bsk_balance_summary')
            .select('withdrawable_balance')
            .eq('user_id', user.id)
            .single();
          
          setUserBalance(balanceData?.withdrawable_balance || 0);
        }

        // Get draw results if completed
        if (draws[0].state === 'completed') {
          const { data: resultsData, error: resultsError } = await supabase
            .from('draw_results')
            .select('*')
            .eq('draw_id', draws[0].id)
            .single();

          if (!resultsError && resultsData) {
            setDrawResults(resultsData);
          }
        }
      }

      // Get current BSK rate
      const { data: rateData } = await supabase.rpc('get_current_bsk_rate');
      setBskRate(rateData || 1.0);

    } catch (error) {
      console.error('Error loading draw data:', error);
      toast({
        title: "Error",
        description: "Failed to load lucky draw information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseTickets = async () => {
    if (!user || !drawConfig) return;

    try {
      setPurchasing(true);

      const { data, error } = await supabase.functions.invoke('draw-purchase', {
        body: {
          draw_id: drawConfig.id,
          ticket_count: ticketCount
        }
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: "Tickets Purchased!",
          description: `Successfully bought ${result.tickets_created} ticket(s) for ${result.total_bsk_cost.toFixed(2)} BSK`,
        });

        // Reload data
        await loadDrawData();
        setTicketCount(1);
      } else {
        throw new Error(result?.error || 'Purchase failed');
      }

    } catch (error: any) {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase tickets",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const getBskEquivalent = (inrAmount: number) => {
    return (inrAmount / bskRate).toFixed(2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRankEmoji = (rank: string) => {
    switch (rank) {
      case 'first': return '🥇';
      case 'second': return '🥈';
      case 'third': return '🥉';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!drawConfig) {
    return (
      <div className="min-h-screen flex flex-col bg-background px-6 py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Lucky Draw</h1>
        </div>
        
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-8 text-center">
            <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No Active Draw</h3>
            <p className="text-sm text-muted-foreground">
              There are no active lucky draws at the moment. Check back later!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCost = drawConfig.ticket_price_bsk * ticketCount;
  const totalBskCost = parseFloat(getBskEquivalent(totalCost));
  const spacesRemaining = drawConfig.pool_size - drawConfig.current_participants;
  const canPurchase = user && drawConfig.state === 'open' && spacesRemaining >= ticketCount && 
                     userBalance >= totalBskCost && userTickets.length + ticketCount <= drawConfig.per_user_ticket_cap;

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Lucky Draw</h1>
      </div>

      {/* Draw Status Card */}
      <Card className="bg-gradient-card shadow-card border-0 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Gift className="w-8 h-8 text-purple-500" />
              <div>
                <CardTitle className="text-xl">{drawConfig.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {drawConfig.current_participants}/{drawConfig.pool_size} participants
                </p>
              </div>
            </div>
            <Badge variant={drawConfig.state === 'completed' ? 'default' : 'secondary'}>
              {drawConfig.state.toUpperCase()}
            </Badge>
          </div>
          
          {drawConfig.state !== 'completed' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Pool Progress</span>
                <span>{drawConfig.current_participants}/{drawConfig.pool_size}</span>
              </div>
              <Progress 
                value={(drawConfig.current_participants / drawConfig.pool_size) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground text-center">
                {spacesRemaining} spaces remaining
              </p>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Ticket Price</p>
              <p className="text-lg font-bold">{drawConfig.ticket_price_bsk} BSK</p>
              <p className="text-xs text-muted-foreground">≈ ₹{(drawConfig.ticket_price_bsk * bskRate).toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Your Balance</p>
              <p className="text-lg font-bold">{userBalance.toFixed(2)} BSK</p>
              <p className="text-xs text-muted-foreground">≈ ₹{(userBalance * bskRate).toFixed(0)}</p>
            </div>
          </div>

          {/* Prize Information */}
          <div className="bg-muted/20 rounded-lg p-3">
            <h4 className="font-medium mb-2 text-center">Prize Pool</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {prizes.map((prize) => (
                <div key={prize.rank} className="text-center">
                  <div className="font-bold">{getRankEmoji(prize.rank)}</div>
                  <div>₹{(prize.amount_bsk * bskRate).toLocaleString()}</div>
                  <div className="text-muted-foreground">{prize.amount_bsk.toFixed(2)} BSK</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              After {drawConfig.fee_percent}% admin fee
            </p>
          </div>

          {/* Purchase Controls */}
          {drawConfig.state === 'open' && user && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Tickets to buy:</span>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-medium">{ticketCount}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTicketCount(Math.min(
                      Math.min(drawConfig.per_user_ticket_cap - userTickets.length, spacesRemaining), 
                      ticketCount + 1
                    ))}
                  >
                    +
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Total Cost:</span>
                <span className="font-bold">₹{totalCost} ({totalBskCost} BSK)</span>
              </div>

              <Button 
                onClick={handlePurchaseTickets} 
                className="w-full" 
                size="lg"
                disabled={purchasing || !canPurchase}
              >
                <Ticket className="w-4 h-4 mr-2" />
                {purchasing ? 'Processing...' : 
                 !user ? 'Login Required' :
                 drawConfig.state !== 'open' ? 'Draw Closed' :
                 spacesRemaining < ticketCount ? 'Not Enough Spaces' :
                 userBalance < totalBskCost ? 'Insufficient Balance' :
                 userTickets.length + ticketCount > drawConfig.per_user_ticket_cap ? 'Ticket Limit Reached' :
                 `Buy ${ticketCount} Ticket${ticketCount > 1 ? 's' : ''}`}
              </Button>
            </div>
          )}

          {!user && (
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <Info className="w-4 h-4 inline mr-1" />
                Please log in to purchase tickets and participate in the draw.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="tickets" className="flex-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tickets">My Tickets ({userTickets.length})</TabsTrigger>
          <TabsTrigger value="prizes">Prize Info</TabsTrigger>
          <TabsTrigger value="proof">
            {drawConfig.state === 'completed' ? 'Proof' : 'How It Works'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          {userTickets.length > 0 ? (
            userTickets.map((ticket) => (
              <Card key={ticket.id} className="bg-gradient-card shadow-card border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Ticket className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-medium">#{ticket.ticket_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status === 'won' && ticket.prize_rank ? 
                          `${getRankEmoji(ticket.prize_rank)} ${ticket.status.toUpperCase()}` : 
                          ticket.status.toUpperCase()}
                      </Badge>
                      {ticket.prize_bsk_net && (
                        <p className="text-sm font-bold text-green-600 mt-1">
                          +{ticket.prize_bsk_net.toFixed(2)} BSK
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-8 text-center">
                <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Tickets Yet</h3>
                <p className="text-sm text-muted-foreground">
                  {user ? 'Purchase tickets above to participate!' : 'Please log in to view your tickets'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="prizes" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base">Prize Structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {prizes.map((prize, index) => (
                <div key={prize.rank} className="flex items-center justify-between p-3 bg-muted/10 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getRankEmoji(prize.rank)}</span>
                    <div>
                      <p className="font-medium capitalize">{prize.rank} Place</p>
                      <p className="text-sm text-muted-foreground">
                        Gross: {prize.amount_bsk.toFixed(2)} BSK (≈ ₹{(prize.amount_bsk * bskRate).toLocaleString()})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {((prize.amount_bsk * (100 - drawConfig.fee_percent)) / 100).toFixed(2)} BSK
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ≈ ₹{((prize.amount_bsk * (100 - drawConfig.fee_percent)) / 100 * bskRate).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <Shield className="w-4 h-4 inline mr-1" />
                  All prizes are paid in BSK to your withdrawable balance after a {drawConfig.fee_percent}% admin fee.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proof" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                {drawConfig.state === 'completed' ? 'Provably Fair Proof' : 'How It Works'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {drawConfig.state === 'completed' && drawResults ? (
                <div className="space-y-4">
                  <div className="p-3 bg-muted/10 rounded-lg">
                    <h4 className="font-medium mb-2">Verification Data</h4>
                    <div className="space-y-2 text-sm font-mono">
                      <div>
                        <span className="text-muted-foreground">Server Seed: </span>
                        <span className="break-all">{drawResults.server_seed.substring(0, 32)}...</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Client Seed: </span>
                        <span className="break-all">{drawResults.client_seed.substring(0, 32)}...</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Nonce: </span>
                        <span>{drawResults.nonce}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      ✅ This draw was conducted using provably fair randomness. 
                      Winners were determined using HMAC-SHA256 + Fisher-Yates shuffle algorithm.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Winners</h4>
                    {drawResults.winners.map((winner: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/10 rounded">
                        <span>{getRankEmoji(winner.rank)} {winner.rank} Place</span>
                        <span className="font-bold">{winner.prize_bsk_net.toFixed(2)} BSK</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Commitment Phase</p>
                        <p className="text-sm text-muted-foreground">
                          When the pool fills up, a server seed is generated and hashed (commit-reveal scheme).
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Randomness Generation</p>
                        <p className="text-sm text-muted-foreground">
                          Winners are determined using HMAC-SHA256 with server + client seeds, then Fisher-Yates shuffle.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Reveal & Verification</p>
                        <p className="text-sm text-muted-foreground">
                          After winners are selected, all seeds are revealed for public verification.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <Shield className="w-4 h-4 inline mr-1" />
                      This system ensures fairness - neither players nor operators can manipulate the results.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NewLuckyDraw;