-- Create saved_reports table
CREATE TABLE public.saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id),
  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  config JSONB NOT NULL,
  is_scheduled BOOLEAN DEFAULT false,
  schedule_cron TEXT,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage saved_reports"
ON public.saved_reports
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create report_snapshots table
CREATE TABLE public.report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.saved_reports(id),
  generated_by UUID REFERENCES auth.users(id),
  snapshot_data JSONB NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  file_path TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage report_snapshots"
ON public.report_snapshots
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create daily_platform_metrics table
CREATE TABLE public.daily_platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  bsk_total_supply NUMERIC DEFAULT 0,
  bsk_withdrawable_total NUMERIC DEFAULT 0,
  bsk_holding_total NUMERIC DEFAULT 0,
  inr_total_balance NUMERIC DEFAULT 0,
  deposits_count INTEGER DEFAULT 0,
  deposits_amount NUMERIC DEFAULT 0,
  withdrawals_count INTEGER DEFAULT 0,
  withdrawals_amount NUMERIC DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  active_users_24h INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_fees_collected NUMERIC DEFAULT 0,
  tvl NUMERIC DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.daily_platform_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage daily_platform_metrics"
ON public.daily_platform_metrics
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to calculate daily metrics
CREATE OR REPLACE FUNCTION public.calculate_daily_metrics(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  metrics JSONB;
BEGIN
  SELECT jsonb_build_object(
    'bsk_total_supply', COALESCE((SELECT SUM(withdrawable_balance + holding_balance) FROM user_bsk_balances), 0),
    'bsk_withdrawable_total', COALESCE((SELECT SUM(withdrawable_balance) FROM user_bsk_balances), 0),
    'bsk_holding_total', COALESCE((SELECT SUM(holding_balance) FROM user_bsk_balances), 0),
    'inr_total_balance', COALESCE((SELECT SUM(balance) FROM user_inr_balances), 0),
    'deposits_count', COALESCE((SELECT COUNT(*) FROM fiat_deposits WHERE DATE(created_at) = p_date), 0),
    'deposits_amount', COALESCE((SELECT SUM(amount) FROM fiat_deposits WHERE DATE(created_at) = p_date), 0),
    'withdrawals_count', COALESCE((SELECT COUNT(*) FROM fiat_withdrawals WHERE DATE(created_at) = p_date), 0),
    'withdrawals_amount', COALESCE((SELECT SUM(amount) FROM fiat_withdrawals WHERE DATE(created_at) = p_date), 0),
    'total_users', COALESCE((SELECT COUNT(*) FROM profiles), 0),
    'active_users_24h', COALESCE((SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours'), 0),
    'new_users', COALESCE((SELECT COUNT(*) FROM profiles WHERE DATE(created_at) = p_date), 0)
  ) INTO metrics;
  
  RETURN metrics;
END;
$$;

-- Create function to generate report data
CREATE OR REPLACE FUNCTION public.generate_report_data(
  p_report_type TEXT,
  p_date_start DATE,
  p_date_end DATE,
  p_filters JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
BEGIN
  CASE p_report_type
    WHEN 'daily_ops' THEN
      SELECT jsonb_build_object(
        'deposits', (
          SELECT COALESCE(jsonb_agg(row_to_json(fd)), '[]'::jsonb) 
          FROM fiat_deposits fd 
          WHERE created_at::DATE BETWEEN p_date_start AND p_date_end
        ),
        'withdrawals', (
          SELECT COALESCE(jsonb_agg(row_to_json(fw)), '[]'::jsonb) 
          FROM fiat_withdrawals fw 
          WHERE created_at::DATE BETWEEN p_date_start AND p_date_end
        ),
        'summary', (
          SELECT jsonb_build_object(
            'total_deposits', COALESCE(COUNT(*), 0),
            'total_deposit_amount', COALESCE(SUM(amount), 0),
            'total_withdrawals', COALESCE((SELECT COUNT(*) FROM fiat_withdrawals WHERE created_at::DATE BETWEEN p_date_start AND p_date_end), 0),
            'total_withdrawal_amount', COALESCE((SELECT SUM(amount) FROM fiat_withdrawals WHERE created_at::DATE BETWEEN p_date_start AND p_date_end), 0)
          ) 
          FROM fiat_deposits 
          WHERE created_at::DATE BETWEEN p_date_start AND p_date_end
        )
      ) INTO result;
    WHEN 'user_activity' THEN
      SELECT jsonb_build_object(
        'new_users', COALESCE((SELECT COUNT(*) FROM profiles WHERE created_at::DATE BETWEEN p_date_start AND p_date_end), 0),
        'active_users', COALESCE((SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE created_at::DATE BETWEEN p_date_start AND p_date_end), 0),
        'total_users', COALESCE((SELECT COUNT(*) FROM profiles WHERE created_at::DATE <= p_date_end), 0)
      ) INTO result;
    WHEN 'currency_flow' THEN
      SELECT jsonb_build_object(
        'bsk_metrics', (
          SELECT jsonb_build_object(
            'total_supply', COALESCE(SUM(withdrawable_balance + holding_balance), 0),
            'withdrawable', COALESCE(SUM(withdrawable_balance), 0),
            'holding', COALESCE(SUM(holding_balance), 0)
          )
          FROM user_bsk_balances
        ),
        'inr_metrics', (
          SELECT jsonb_build_object(
            'total_balance', COALESCE(SUM(balance), 0)
          )
          FROM user_inr_balances
        )
      ) INTO result;
    ELSE
      result := '{}'::jsonb;
  END CASE;
  
  RETURN result;
END;
$$;