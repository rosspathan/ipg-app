import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fetchWithTimeout, getErrorMessage } from "@/utils/fetchWithTimeout";

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: 'account' | 'kyc' | 'funding' | 'trade' | 'technical' | 'other';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'pending_user' | 'pending_admin' | 'resolved' | 'closed';
  last_msg_at: string;
  created_at: string;
  meta?: any;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin';
  sender_id: string;
  body: string;
  attachment_url?: string;
  created_at: string;
}

export const useSupport = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const loadTickets = useCallback(async (search?: string) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('last_msg_at', { ascending: false });

      if (search?.trim()) {
        query = query.ilike('subject', `%${search}%`);
      }

      const { data, error } = await fetchWithTimeout(
        () => query.then(res => res),
        { ms: 10000 }
      );

      if (error) throw error;
      setTickets(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading tickets",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadMessages = useCallback(async (ticketId: string) => {
    try {
      const { data, error } = await fetchWithTimeout(
        () => supabase
          .from('support_messages')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true })
          .then(res => res),
        { ms: 10000 }
      );

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  }, [toast]);

  const createTicket = async (ticketData: {
    subject: string;
    category: string;
    priority: string;
    body: string;
    attachment?: File;
  }) => {
    try {
      setSubmitting(true);

      // Get current user
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.user.id,
          subject: ticketData.subject,
          category: ticketData.category,
          priority: ticketData.priority,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      let attachmentUrl: string | undefined;

      // Upload attachment if provided
      if (ticketData.attachment) {
        const fileExt = ticketData.attachment.name.split('.').pop();
        const fileName = `${ticket.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('support')
          .upload(fileName, ticketData.attachment);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('support')
          .getPublicUrl(fileName);

        attachmentUrl = urlData.publicUrl;
      }

      // Create first message
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_type: 'user',
          sender_id: ticket.user_id,
          body: ticketData.body,
          attachment_url: attachmentUrl,
        });

      if (messageError) throw messageError;

      toast({
        title: "Ticket created",
        description: "Your support ticket has been submitted successfully.",
      });

      return ticket.id;
    } catch (error: any) {
      toast({
        title: "Error creating ticket",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const postMessage = async (ticketId: string, body: string, attachment?: File) => {
    try {
      setSubmitting(true);

      let attachmentUrl: string | undefined;

      // Upload attachment if provided
      if (attachment) {
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${ticketId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('support')
          .upload(fileName, attachment);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('support')
          .getPublicUrl(fileName);

        attachmentUrl = urlData.publicUrl;
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticketId,
          sender_type: 'user',
          sender_id: user.user.id,
          body,
          attachment_url: attachmentUrl,
        });

      if (error) throw error;

      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });

      // Reload messages
      await loadMessages(ticketId);
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Ticket status has been updated to ${status}.`,
      });

      // Reload tickets
      await loadTickets();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  // Realtime subscriptions
  useEffect(() => {
    const ticketChannel = supabase
      .channel('support_tickets_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_tickets',
      }, () => {
        loadTickets();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel('support_messages_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_messages',
      }, () => {
        // Reload messages for current ticket if any
        if (messages.length > 0) {
          loadMessages(messages[0].ticket_id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [loadTickets, loadMessages, messages]);

  return {
    tickets,
    messages,
    loading,
    submitting,
    loadTickets,
    loadMessages,
    createTicket,
    postMessage,
    updateTicketStatus,
  };
};