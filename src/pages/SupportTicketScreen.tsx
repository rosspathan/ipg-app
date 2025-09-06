import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Paperclip, Download, Loader2, MessageCircle } from "lucide-react";
import { useSupport, type SupportTicket, type SupportMessage } from "@/hooks/useSupport";
import { format } from "date-fns";

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

export const SupportTicketScreen = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { tickets, messages, loading, submitting, loadTickets, loadMessages, postMessage, updateTicketStatus } = useSupport();
  
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ticket = tickets.find(t => t.id === id);

  useEffect(() => {
    if (id) {
      loadMessages(id);
    }
    if (tickets.length === 0) {
      loadTickets();
    }
  }, [id, loadMessages, loadTickets, tickets.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id) return;
    
    try {
      await postMessage(id, newMessage, attachment || undefined);
      setNewMessage("");
      setAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    await updateTicketStatus(id, newStatus);
  };

  const renderMessage = (message: SupportMessage) => {
    const isUser = message.sender_type === 'user';
    
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[70%] ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {isUser ? 'You' : 'Support Agent'}
            </span>
            <span className="text-xs opacity-70">
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
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="text-center py-8">
            <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Ticket not found</p>
            <Button onClick={() => navigate('/app/support')} className="mt-4">
              Back to Support
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canClose = ticket.status !== 'closed';
  const canReopen = ticket.status === 'closed';

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/app/support')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{ticket.subject}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <Badge variant="secondary">{categoryLabels[ticket.category]}</Badge>
            <span>Priority: {ticket.priority}</span>
            <span>Created: {format(new Date(ticket.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${statusColors[ticket.status]}`} />
          <span className="text-sm font-medium capitalize">
            {ticket.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Conversation</span>
              <div className="flex gap-2">
                {canReopen && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleStatusChange('open')}
                  >
                    Reopen Ticket
                  </Button>
                )}
                {canClose && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleStatusChange('closed')}
                  >
                    Close Ticket
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[400px] max-h-[600px] overflow-y-auto p-4 border rounded-lg bg-background/50">
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

            {/* Message Composer */}
            {ticket.status !== 'closed' && (
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="message">Reply</Label>
                  <Textarea
                    id="message"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
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
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};