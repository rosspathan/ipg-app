import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, Paperclip, Download, Loader2, MessageCircle, Copy } from "lucide-react";
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
  meta?: any;
  user_email?: string;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin';
  sender_id: string;
  body: string;
  attachment_url?: string;
  created_at: string;
}

const statusColors = {
  open: "bg-blue-500",
  pending_user: "bg-orange-500",
  pending_admin: "bg-yellow-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
};

const categoryLabels = {
  account: "Account",
  kyc: "KYC/Verification", 
  funding: "Deposits & Withdrawals",
  trade: "Trading",
  technical: "Technical Issues",
  other: "Other",
};

export const AdminSupportTicketScreen = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [ticket, setTicket] = useState<AdminSupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTicket = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          profiles:user_id (
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setTicket({
        ...data,
        user_email: data.profiles?.email || 'Unknown',
      });
    } catch (error: any) {
      toast({
        title: "Error loading ticket",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateTicketStatus = async (newStatus: string) => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      setTicket(prev => prev ? { ...prev, status: newStatus } : null);
      
      toast({
        title: "Status updated",
        description: `Ticket status changed to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateTicketPriority = async (newPriority: string) => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ priority: newPriority })
        .eq('id', id);

      if (error) throw error;
      
      setTicket(prev => prev ? { ...prev, priority: newPriority } : null);
      
      toast({
        title: "Priority updated",
        description: `Ticket priority changed to ${newPriority}`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating priority", 
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendAdminReply = async () => {
    if (!newMessage.trim() || !id || !ticket) return;
    
    try {
      setSubmitting(true);

      let attachmentUrl: string | undefined;

      // Upload attachment if provided
      if (attachment) {
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('support')
          .upload(fileName, attachment);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('support')
          .getPublicUrl(fileName);

        attachmentUrl = urlData.publicUrl;
      }

      const { data: adminUser } = await supabase.auth.getUser();
      if (!adminUser.user) throw new Error('Not authenticated');

      // Send message
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: id,
          sender_type: 'admin',
          sender_id: adminUser.user.id,
          body: newMessage,
          attachment_url: attachmentUrl,
        });

      if (messageError) throw messageError;

      // Update ticket status to pending_user
      await updateTicketStatus('pending_user');

      // Create notification for user
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: ticket.user_id,
          type: 'system',
          title: 'Support reply',
          body: `You have a new reply on your ticket: ${ticket.subject}`,
          meta: { ticket_id: id },
          link_url: `/app/support/t/${id}`,
        });

      if (notifError) {
        console.error('Failed to create notification:', notifError);
      }

      setNewMessage("");
      setAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Reload messages
      await loadMessages();

      toast({
        title: "Reply sent",
        description: "Your reply has been sent to the user",
      });

    } catch (error: any) {
      toast({
        title: "Error sending reply",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadTicket();
      loadMessages();
    }
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const copyUserId = () => {
    if (ticket) {
      navigator.clipboard.writeText(ticket.user_id);
      toast({
        title: "Copied",
        description: "User ID copied to clipboard",
      });
    }
  };

  const renderMessage = (message: SupportMessage) => {
    const isAdmin = message.sender_type === 'admin';
    
    return (
      <div key={message.id} className={`flex ${isAdmin ? 'justify-start' : 'justify-end'} mb-4`}>
        <div className={`max-w-[70%] ${isAdmin ? 'bg-blue-50 border-blue-200' : 'bg-muted'} rounded-lg p-3 border`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {isAdmin ? 'Admin' : 'User'}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(message.created_at), 'MMM d, h:mm a')}
            </span>
          </div>
          
          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
          
          {message.attachment_url && (
            <div className="mt-2 pt-2 border-t border-border/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(message.attachment_url, '_blank')}
                className="h-auto p-1"
              >
                <Download className="h-3 w-3 mr-1" />
                <span className="text-xs">View Attachment</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading && !ticket) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Ticket not found</p>
            <Button onClick={() => navigate('/admin/support')} className="mt-4">
              Back to Support Inbox
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/admin/support')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{ticket.subject}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span>User: {ticket.user_email}</span>
            <Button variant="ghost" size="sm" onClick={copyUserId} className="h-auto p-1">
              <Copy className="h-3 w-3 mr-1" />
              {ticket.user_id.slice(0, 8)}...
            </Button>
            <span>Created: {format(new Date(ticket.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
      </div>

      {/* Ticket Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={ticket.status} onValueChange={updateTicketStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending_user">Pending User</SelectItem>
                <SelectItem value="pending_admin">Pending Admin</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={ticket.priority} onValueChange={updateTicketPriority}>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Category</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">
              {categoryLabels[ticket.category as keyof typeof categoryLabels]}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-h-[400px] max-h-[600px] overflow-y-auto p-4 border rounded-lg bg-background/50 mb-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              <>
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Admin Reply Composer */}
          {ticket.status !== 'closed' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="adminReply">Admin Reply</Label>
                <Textarea
                  id="adminReply"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your reply to the user..."
                  rows={4}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach
                  </Button>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  {attachment && (
                    <span className="text-sm text-muted-foreground">
                      {attachment.name}
                    </span>
                  )}
                </div>
                
                <Button 
                  onClick={sendAdminReply}
                  disabled={!newMessage.trim() || submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};