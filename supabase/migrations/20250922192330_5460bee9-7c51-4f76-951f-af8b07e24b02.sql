-- Create lucky_draw_tickets table
CREATE TABLE public.lucky_draw_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  config_id UUID NOT NULL REFERENCES public.lucky_draw_configs(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
  prize_amount NUMERIC DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lucky_draw_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage all tickets" 
ON public.lucky_draw_tickets 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own tickets" 
ON public.lucky_draw_tickets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tickets" 
ON public.lucky_draw_tickets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_lucky_draw_tickets_user_id ON public.lucky_draw_tickets(user_id);
CREATE INDEX idx_lucky_draw_tickets_config_id ON public.lucky_draw_tickets(config_id);
CREATE INDEX idx_lucky_draw_tickets_status ON public.lucky_draw_tickets(status);

-- Add trigger for updated_at
CREATE TRIGGER update_lucky_draw_tickets_updated_at
BEFORE UPDATE ON public.lucky_draw_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();