-- Support System Tables
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('account','kyc','funding','trade','technical','other')) DEFAULT 'other',
  priority TEXT NOT NULL CHECK (priority IN ('low','normal','high','urgent')) DEFAULT 'normal',
  status TEXT NOT NULL CHECK (status IN ('open','pending_user','pending_admin','resolved','closed')) DEFAULT 'open',
  last_msg_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  meta JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user','admin')),
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications System Tables
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system','security','funding','trade','programs','marketing')) DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  link_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications_read (
  user_id UUID NOT NULL,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_id)
);

-- Push Tokens (optional MVP)
CREATE TABLE public.push_tokens (
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);

-- Indexes for performance
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_last_msg_at ON public.support_tickets(last_msg_at DESC);
CREATE INDEX idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_read ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Support Tickets
CREATE POLICY "Users can view own tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets" ON public.support_tickets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all tickets" ON public.support_tickets
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for Support Messages
CREATE POLICY "Users can view messages for own tickets" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = support_messages.ticket_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages for own tickets" ON public.support_messages
  FOR INSERT WITH CHECK (
    sender_type = 'user' AND
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = support_messages.ticket_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all messages" ON public.support_messages
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all notifications" ON public.notifications
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for Notifications Read
CREATE POLICY "Users can manage own read status" ON public.notifications_read
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all read status" ON public.notifications_read
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for Push Tokens
CREATE POLICY "Users can manage own push tokens" ON public.push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Trigger to update last_msg_at on support_tickets
CREATE OR REPLACE FUNCTION public.update_ticket_last_msg()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_tickets 
  SET last_msg_at = NEW.created_at 
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_ticket_last_msg_trigger
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticket_last_msg();

-- Storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('support', 'support', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for support bucket
CREATE POLICY "Users can upload support attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'support' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own support attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'support' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admin can manage all support attachments" ON storage.objects
  FOR ALL USING (
    bucket_id = 'support' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Enable realtime for tables
ALTER publication supabase_realtime ADD TABLE public.support_tickets;
ALTER publication supabase_realtime ADD TABLE public.support_messages;
ALTER publication supabase_realtime ADD TABLE public.notifications;
ALTER publication supabase_realtime ADD TABLE public.notifications_read;