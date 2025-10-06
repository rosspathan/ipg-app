-- Create support_links table for admin-managed WhatsApp support configuration
CREATE TABLE IF NOT EXISTS public.support_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_phone_e164 TEXT NOT NULL DEFAULT '+919133444118',
  default_message TEXT NOT NULL DEFAULT 'Hello iSMART support',
  host TEXT NOT NULL DEFAULT 'https://wa.me',
  custom_scheme TEXT NOT NULL DEFAULT 'whatsapp',
  play_fallback_url TEXT NOT NULL DEFAULT 'https://play.google.com/store/apps/details?id=com.whatsapp',
  web_fallback_url TEXT NOT NULL DEFAULT '/support',
  open_target TEXT NOT NULL DEFAULT '_blank' CHECK (open_target IN ('_blank', '_self')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.support_links ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active settings
CREATE POLICY "Anyone can read active support links"
  ON public.support_links
  FOR SELECT
  USING (is_active = true);

-- Policy: Only admins can manage settings
CREATE POLICY "Admins can manage support links"
  ON public.support_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default configuration
INSERT INTO public.support_links (
  whatsapp_phone_e164,
  default_message,
  host,
  custom_scheme,
  play_fallback_url,
  web_fallback_url,
  open_target,
  is_active
) VALUES (
  '+919133444118',
  'Hello iSMART support',
  'https://wa.me',
  'whatsapp',
  'https://play.google.com/store/apps/details?id=com.whatsapp',
  '/support',
  '_blank',
  true
) ON CONFLICT DO NOTHING;

-- Create updated_at trigger
CREATE TRIGGER update_support_links_updated_at
  BEFORE UPDATE ON public.support_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit log trigger
CREATE OR REPLACE FUNCTION public.audit_support_links_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'support_links_created'
      WHEN TG_OP = 'UPDATE' THEN 'support_links_updated'
      WHEN TG_OP = 'DELETE' THEN 'support_links_deleted'
    END,
    'support_links',
    COALESCE(NEW.id, OLD.id)::text,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    now()
  );
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_support_links_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.support_links
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_support_links_changes();