-- Create admin_balance_adjustments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_balance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  balance_type TEXT NOT NULL,
  operation TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  before_balance NUMERIC,
  after_balance NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create admin notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('bsk_transfer', 'user_signup', 'kyc_approval', 'kyc_rejection', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  related_user_id UUID,
  related_resource_id UUID,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_balance_adjustments_created ON public.admin_balance_adjustments(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_balance_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.admin_notifications;
CREATE POLICY "Admins can view all notifications"
  ON public.admin_notifications
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update notifications" ON public.admin_notifications;
CREATE POLICY "Admins can update notifications"
  ON public.admin_notifications
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "System can create notifications" ON public.admin_notifications;
CREATE POLICY "System can create notifications"
  ON public.admin_notifications
  FOR INSERT
  WITH CHECK (true);

-- Policies for balance adjustments
DROP POLICY IF EXISTS "Admins can view adjustments" ON public.admin_balance_adjustments;
CREATE POLICY "Admins can view adjustments"
  ON public.admin_balance_adjustments
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "System can create adjustments" ON public.admin_balance_adjustments;
CREATE POLICY "System can create adjustments"
  ON public.admin_balance_adjustments
  FOR INSERT
  WITH CHECK (true);

-- Enable real-time
ALTER TABLE public.admin_notifications REPLICA IDENTITY FULL;

-- Function to create BSK transfer notification
CREATE OR REPLACE FUNCTION public.notify_admin_bsk_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (
    type,
    title,
    message,
    metadata,
    related_user_id,
    related_resource_id,
    priority
  )
  SELECT
    'bsk_transfer',
    'BSK ' || UPPER(SUBSTRING(NEW.operation, 1, 1)) || SUBSTRING(NEW.operation, 2) || ' - ' || COALESCE(p.full_name, p.display_name, u.email, 'Unknown User'),
    NEW.amount::text || ' BSK ' || 
    CASE WHEN NEW.operation = 'add' THEN 'credited to' ELSE 'debited from' END ||
    ' ' || COALESCE(p.full_name, p.display_name, 'user'),
    jsonb_build_object(
      'admin_id', NEW.admin_user_id,
      'target_user_id', NEW.target_user_id,
      'balance_type', NEW.balance_type,
      'operation', NEW.operation,
      'amount', NEW.amount,
      'reason', NEW.reason,
      'before_balance', NEW.before_balance,
      'after_balance', NEW.after_balance
    ),
    NEW.target_user_id,
    NEW.id,
    CASE WHEN NEW.amount > 10000 THEN 'high' ELSE 'normal' END
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.id = NEW.target_user_id;
  
  RETURN NEW;
END;
$$;

-- Function to create user signup notification
CREATE OR REPLACE FUNCTION public.notify_admin_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify for new profiles (skip updates)
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.admin_notifications (
    type,
    title,
    message,
    metadata,
    related_user_id,
    priority
  )
  SELECT
    'user_signup',
    'New User Registered',
    COALESCE(NEW.full_name, NEW.display_name, u.email, 'New user') || ' just signed up',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'email', u.email,
      'full_name', NEW.full_name,
      'display_name', NEW.display_name,
      'referral_code', NEW.referral_code
    ),
    NEW.user_id,
    'normal'
  FROM auth.users u
  WHERE u.id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_admin_bsk_transfer ON public.admin_balance_adjustments;
DROP TRIGGER IF EXISTS trigger_notify_admin_user_signup ON public.profiles;

-- Create triggers
CREATE TRIGGER trigger_notify_admin_bsk_transfer
  AFTER INSERT ON public.admin_balance_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_bsk_transfer();

CREATE TRIGGER trigger_notify_admin_user_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_user_signup();