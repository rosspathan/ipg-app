import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, MessageCircle, Clock, AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AdminSupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  last_msg_at: string;
  created_at: string;
  user_email?: string;
}

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

export const AdminSupportScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const loadTickets = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('last_msg_at', { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }
      
      if (categoryFilter !== "all") {
        query = query.eq('category', categoryFilter);
      }
      
      if (priorityFilter !== "all") {
        query = query.eq('priority', priorityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get user emails separately for each ticket
      const ticketsWithEmails = await Promise.all(
        (data || []).map(async (ticket: any) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', ticket.user_id)
            .single();

          return {
            ...ticket,
            user_email: profileData?.email || 'Unknown',
          };
        })
      );

      setTickets(ticketsWithEmails);
    } catch (error: any) {
      toast({
        title: "Error loading tickets",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter, categoryFilter, priorityFilter]);

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTicketRow = (ticket: AdminSupportTicket) => {
    const StatusIcon = statusIcons[ticket.status as keyof typeof statusIcons];
    
    return (
      <TableRow 
        key={ticket.id}
        className="cursor-pointer hover:bg-accent/50"
        onClick={() => navigate(`/admin/support/t/${ticket.id}`)}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            <span className="font-medium">{ticket.subject}</span>
          </div>
        </TableCell>
        <TableCell>
          <div>
            <div className="font-medium">{ticket.user_email}</div>
            <div className="text-xs text-muted-foreground">{ticket.user_id}</div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary">{categoryLabels[ticket.category as keyof typeof categoryLabels]}</Badge>
        </TableCell>
        <TableCell>
          <Badge 
            variant={ticket.priority === 'urgent' ? 'destructive' : 
                   ticket.priority === 'high' ? 'default' : 'secondary'}
          >
            {ticket.priority}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColors[ticket.status as keyof typeof statusColors]}`} />
            <span className="capitalize">{ticket.status.replace('_', ' ')}</span>
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {format(new Date(ticket.last_msg_at), 'MMM d, h:mm a')}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Support Inbox</h1>
          <p className="text-muted-foreground">Manage customer support tickets</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets, users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending_user">Pending User</SelectItem>
                <SelectItem value="pending_admin">Pending Admin</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Support Tickets ({filteredTickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No tickets found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map(renderTicketRow)}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};