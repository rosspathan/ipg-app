import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, MessageCircle, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useSupport, type SupportTicket } from "@/hooks/useSupport";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

const statusColors = {
  open: "bg-blue-500",
  pending_user: "bg-orange-500",
  pending_admin: "bg-yellow-500", 
  resolved: "bg-green-500",
  closed: "bg-gray-500",
};

const statusIcons = {
  open: AlertCircle,
  pending_user: Clock,
  pending_admin: Clock,
  resolved: CheckCircle,
  closed: XCircle,
};

const categoryLabels = {
  account: "Account",
  kyc: "KYC/Verification",
  funding: "Deposits & Withdrawals",
  trade: "Trading",
  technical: "Technical Issues",
  other: "Other",
};

const faqData = [
  {
    question: "How do I verify my account?",
    answer: "To verify your account, go to Profile > KYC and upload the required documents including ID and selfie. Verification typically takes 1-3 business days."
  },
  {
    question: "What are the deposit limits?",
    answer: "Deposit limits vary by verification level and payment method. Check the Deposit page for current limits specific to your account."
  },
  {
    question: "How long do withdrawals take?",
    answer: "Crypto withdrawals typically process within 30 minutes to 1 hour. Bank transfers may take 1-3 business days."
  },
  {
    question: "Is my data secure?",
    answer: "Yes, we use industry-standard encryption and security measures to protect your personal and financial information."
  },
];

export const SupportScreen = () => {
  const navigate = useNavigate();
  const { tickets, loading, loadTickets, createTicket, submitting } = useSupport();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  // New ticket form state
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "other",
    priority: "normal",
    body: "",
    attachment: null as File | null,
  });

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTicket = async () => {
    try {
      const ticketId = await createTicket(newTicket);
      setIsCreateDialogOpen(false);
      setNewTicket({
        subject: "",
        category: "other",
        priority: "normal",
        body: "",
        attachment: null,
      });
      navigate(`/app/support/t/${ticketId}`);
    } catch (error) {
      // Error handled in hook
    }
  };

  const renderTicketRow = (ticket: SupportTicket) => {
    const StatusIcon = statusIcons[ticket.status];
    return (
      <Card 
        key={ticket.id}
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => navigate(`/app/support/t/${ticket.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium">{ticket.subject}</h3>
                <Badge variant="secondary" className="text-xs">
                  {categoryLabels[ticket.category]}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <StatusIcon className="h-3 w-3" />
                  <span className="capitalize">{ticket.status.replace('_', ' ')}</span>
                </div>
                <span>Priority: {ticket.priority}</span>
                <span>Updated: {format(new Date(ticket.last_msg_at), 'MMM d, h:mm a')}</span>
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${statusColors[ticket.status]}`} />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Support</h1>
          <p className="text-muted-foreground">Get help with your account and trading</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief description of your issue"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select 
                    value={newTicket.category} 
                    onValueChange={(value) => setNewTicket(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Priority</Label>
                  <Select 
                    value={newTicket.priority} 
                    onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="body">Description</Label>
                <Textarea
                  id="body"
                  value={newTicket.body}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Describe your issue in detail..."
                  rows={4}
                />
              </div>
              
              <div>
                <Label htmlFor="attachment">Attachment (optional)</Label>
                <Input
                  id="attachment"
                  type="file"
                  onChange={(e) => setNewTicket(prev => ({ 
                    ...prev, 
                    attachment: e.target.files?.[0] || null 
                  }))}
                  accept="image/*,.pdf,.doc,.docx"
                />
              </div>
              
              <Button 
                onClick={handleCreateTicket} 
                disabled={!newTicket.subject || !newTicket.body || submitting}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Ticket"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="tickets" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No tickets found matching your search" : "You haven't created any support tickets yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map(renderTicketRow)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="faq" className="space-y-4">
          <div className="space-y-4">
            {faqData.map((faq, index) => (
              <Card key={index}>
                <CardHeader 
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                >
                  <CardTitle className="text-base flex items-center justify-between">
                    {faq.question}
                    <span className="text-muted-foreground">
                      {expandedFaq === index ? '−' : '+'}
                    </span>
                  </CardTitle>
                </CardHeader>
                {expandedFaq === index && (
                  <CardContent>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};