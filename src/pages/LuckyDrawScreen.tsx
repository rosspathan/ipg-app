import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Gift, Clock, Trophy, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

interface LuckyDrawConfig {
  id: string;
  ticket_price: number;
  prize_pool: number;
  draw_date: string;
  max_winners: number;
  status: string;
}

interface UserTicket {
  id: string;
  user_id: string;
  config_id: string;
  ticket_number: string;
  created_at: string;
  status: string;
  prize_amount?: number;
}

const LuckyDrawScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const [tickets, setTickets] = useState(1);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [drawConfig, setDrawConfig] = useState<LuckyDrawConfig | null>(null);
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [ticketsSold, setTicketsSold] = useState(0);

  useEffect(() => {
    loadLuckyDrawData();
  }, []);

  const loadLuckyDrawData = async () => {
    try {
      setLoading(true);
      
      // Get active draw config
      const { data: configs, error: configError } = await supabase
        .from('lucky_draw_configs')
        .select('*')
        .eq('status', 'active')
        .order('draw_date', { ascending: true })
        .limit(1);

      if (configError) throw configError;
      
      if (configs && configs.length > 0) {
        setDrawConfig(configs[0] as LuckyDrawConfig);
        
        // Get user's tickets for this draw
        if (user) {
          const { data: ticketsData, error: ticketsError } = await supabase.rpc(
            'get_user_lucky_draw_tickets',
            {
              p_user_id: user.id,
              p_config_id: configs[0].id
            }
          );

          if (ticketsError) {
            console.error('Error loading user tickets:', ticketsError);
          } else {
            setUserTickets(ticketsData || []);
          }
        }
        
        // Get total tickets sold count
        const { data: ticketCount, error: countError } = await supabase.rpc(
          'count_lucky_draw_tickets',
          { p_config_id: configs[0].id }
        );

        if (countError) {
          console.error('Error loading ticket count:', countError);
          setTicketsSold(0);
        } else {
          setTicketsSold(ticketCount || 0);
        }
      }
    } catch (error) {
      console.error('Error loading lucky draw data:', error);
      toast({
        title: "Error",
        description: "Failed to load lucky draw information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyTickets = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase tickets",
        variant: "destructive",
      });
      return;
    }

    if (!drawConfig) {
      toast({
        title: "Error",
        description: "No active draw available",
        variant: "destructive",
      });
      return;
    }

    try {
      setPurchasing(true);
      
      // Create tickets using the RPC function
      const { data: result, error: purchaseError } = await supabase.rpc(
        'create_lucky_draw_tickets',
        {
          p_user_id: user.id,
          p_config_id: drawConfig.id,
          p_ticket_count: tickets
        }
      );

      if (purchaseError) throw purchaseError;

      // Parse the JSON response
      const response = result as any;
      if (response?.success) {
        toast({
          title: "Tickets Purchased!",
          description: `Successfully bought ${tickets} ticket(s) for $${(tickets * drawConfig.ticket_price).toFixed(2)}`,
        });

        // Reload the data to get updated tickets and count
        await loadLuckyDrawData();

        // Reset ticket count
        setTickets(1);
      } else {
        throw new Error(response?.message || 'Purchase failed');
      }
      
    } catch (error) {
      console.error('Error purchasing tickets:', error);
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "Failed to purchase tickets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Won": return "text-green-600 border-green-600";
      case "Lost": return "text-red-600 border-red-600";
      case "Pending": return "text-yellow-600 border-yellow-600";
      default: return "text-gray-600 border-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Won": return <Trophy className="w-4 h-4" />;
      case "Lost": return <div className="w-4 h-4" />;
      case "Pending": return <Clock className="w-4 h-4" />;
      default: return <Ticket className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  const maxTicketsPerDraw = 10000; // Could be configurable per draw
  const drawDate = new Date(drawConfig.draw_date);
  const isDrawEnded = drawDate < new Date();

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

      {/* Current Draw Info */}
      <Card className="bg-gradient-card shadow-card border-0 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Gift className="w-8 h-8 text-purple-500" />
              <div>
                <CardTitle className="text-xl">{isDrawEnded ? 'Draw Ended' : 'Next Draw'}</CardTitle>
                <p className="text-sm text-muted-foreground">{drawDate.toLocaleString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">${drawConfig.prize_pool.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Prize Pool</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Ticket Price</p>
              <p className="text-lg font-bold">${drawConfig.ticket_price}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tickets Sold</p>
              <p className="text-lg font-bold">
                {ticketsSold.toLocaleString()} / {maxTicketsPerDraw.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Number of tickets:</span>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setTickets(Math.max(1, tickets - 1))}
                >
                  -
                </Button>
                <span className="w-8 text-center font-medium">{tickets}</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setTickets(Math.min(10, tickets + 1))}
                >
                  +
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span>Total Cost:</span>
              <span className="font-bold">${(tickets * drawConfig.ticket_price).toFixed(2)}</span>
            </div>

            <Button 
              onClick={handleBuyTickets} 
              className="w-full" 
              size="lg"
              disabled={purchasing || isDrawEnded || !user}
            >
              <Ticket className="w-4 h-4 mr-2" />
              {purchasing ? 'Processing...' : isDrawEnded ? 'Draw Ended' : !user ? 'Login Required' : `Buy ${tickets} Ticket${tickets > 1 ? 's' : ''}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tickets" className="flex-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="prizes">Prizes</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          {userTickets.length > 0 ? (
            userTickets.map((ticket) => (
              <Card key={ticket.id} className="bg-gradient-card shadow-card border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(ticket.status)}
                      <div>
                        <p className="font-medium">#{ticket.ticket_number}</p>
                        <p className="text-sm text-muted-foreground">
                          Purchased: {new Date(ticket.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                      {ticket.prize_amount && (
                        <p className="text-sm font-bold text-green-600 mt-1">
                          ${ticket.prize_amount.toLocaleString()}
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
                  {user ? 'Purchase tickets above to participate in the draw!' : 'Please log in to view your tickets'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="prizes" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base">Prize Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Total Prize Pool</span>
                    <span className="text-xl font-bold text-primary">
                      ${drawConfig.prize_pool.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Maximum Winners</span>
                    <span>{drawConfig.max_winners}</span>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-2">
                  <p><strong>How it works:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Purchase tickets before the draw date</li>
                    <li>Winners are randomly selected after the draw closes</li>
                    <li>Prize pool is distributed among winners</li>
                    <li>Winning tickets will be notified automatically</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base">Draw Status</CardTitle>
              <p className="text-sm text-muted-foreground">
                {drawConfig.status === 'active' ? 'Current Draw' : 'Draw Completed'}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-6 bg-muted/20 rounded-lg">
                  {isDrawEnded ? (
                    drawConfig.status === 'completed' ? (
                      <>
                        <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                        <h3 className="font-medium mb-2">Draw Completed</h3>
                        <p className="text-sm text-muted-foreground">
                          Winners have been selected and notified
                        </p>
                      </>
                    ) : (
                      <>
                        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-medium mb-2">Processing Results</h3>
                        <p className="text-sm text-muted-foreground">
                          Draw has ended. Results will be announced soon.
                        </p>
                      </>
                    )
                  ) : (
                    <>
                      <Gift className="w-12 h-12 text-primary mx-auto mb-4" />
                      <h3 className="font-medium mb-2">Draw in Progress</h3>
                      <p className="text-sm text-muted-foreground">
                        Get your tickets before {drawDate.toLocaleDateString()}!
                      </p>
                    </>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{ticketsSold}</p>
                    <p className="text-sm text-muted-foreground">Tickets Sold</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{drawConfig.max_winners}</p>
                    <p className="text-sm text-muted-foreground">Max Winners</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LuckyDrawScreen;