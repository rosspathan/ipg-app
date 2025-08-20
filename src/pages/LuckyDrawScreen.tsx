import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Gift, Clock, Trophy, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LuckyDrawScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tickets, setTickets] = useState(3);

  const drawInfo = {
    ticketPrice: "$5.00",
    prizePool: "$50,000",
    nextDraw: "Dec 31, 2024 23:59",
    ticketsSold: 8456,
    maxTickets: 10000
  };

  const userTickets = [
    { id: "TKT001", drawDate: "Dec 31, 2024", status: "Pending", prize: null },
    { id: "TKT002", drawDate: "Dec 31, 2024", status: "Pending", prize: null },
    { id: "TKT003", drawDate: "Dec 31, 2024", status: "Pending", prize: null },
    { id: "TKT156", drawDate: "Nov 30, 2024", status: "Lost", prize: null },
    { id: "TKT089", drawDate: "Oct 31, 2024", status: "Won", prize: "$100" },
  ];

  const prizeStructure = [
    { prize: "1st Prize", amount: "$25,000", winners: 1, odds: "1:10,000" },
    { prize: "2nd Prize", amount: "$5,000", winners: 2, odds: "1:5,000" },
    { prize: "3rd Prize", amount: "$1,000", winners: 5, odds: "1:2,000" },
    { prize: "4th Prize", amount: "$100", winners: 50, odds: "1:200" },
    { prize: "5th Prize", amount: "$20", winners: 200, odds: "1:50" },
  ];

  const lastDrawResults = [
    { prize: "1st Prize", ticketId: "TKT7891", amount: "$25,000" },
    { prize: "2nd Prize", ticketId: "TKT3456", amount: "$5,000" },
    { prize: "2nd Prize", ticketId: "TKT9012", amount: "$5,000" },
  ];

  const handleBuyTickets = () => {
    toast({
      title: "Tickets Purchased!",
      description: `Successfully bought ${tickets} ticket(s) for $${(tickets * 5).toFixed(2)}`,
    });
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
                <CardTitle className="text-xl">Next Draw</CardTitle>
                <p className="text-sm text-muted-foreground">{drawInfo.nextDraw}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{drawInfo.prizePool}</p>
              <p className="text-sm text-muted-foreground">Prize Pool</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Ticket Price</p>
              <p className="text-lg font-bold">{drawInfo.ticketPrice}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tickets Sold</p>
              <p className="text-lg font-bold">
                {drawInfo.ticketsSold.toLocaleString()} / {drawInfo.maxTickets.toLocaleString()}
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
              <span className="font-bold">${(tickets * 5).toFixed(2)}</span>
            </div>

            <Button onClick={handleBuyTickets} className="w-full" size="lg">
              <Ticket className="w-4 h-4 mr-2" />
              Buy {tickets} Ticket{tickets > 1 ? 's' : ''}
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
          {userTickets.map((ticket) => (
            <Card key={ticket.id} className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(ticket.status)}
                    <div>
                      <p className="font-medium">Ticket #{ticket.id}</p>
                      <p className="text-sm text-muted-foreground">Draw: {ticket.drawDate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={getStatusColor(ticket.status)}>
                      {ticket.status}
                    </Badge>
                    {ticket.prize && (
                      <p className="text-sm font-bold text-green-600 mt-1">{ticket.prize}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="prizes" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base">Prize Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {prizeStructure.map((prize, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">{prize.prize}</p>
                      <p className="text-sm text-muted-foreground">
                        {prize.winners} winner{prize.winners > 1 ? 's' : ''} • {prize.odds}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-primary">{prize.amount}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base">Last Draw Results</CardTitle>
              <p className="text-sm text-muted-foreground">Nov 30, 2024</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lastDrawResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div>
                      <p className="font-medium">{result.prize}</p>
                      <p className="text-sm text-muted-foreground">#{result.ticketId}</p>
                    </div>
                    <p className="text-lg font-bold text-green-600">{result.amount}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LuckyDrawScreen;