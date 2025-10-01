-- BSK Ledger Tables for Phase 1
DROP TABLE IF EXISTS public.user_bsk_balance_summary CASCADE;
DROP TABLE IF EXISTS public.bsk_withdrawable_ledger CASCADE;
DROP TABLE IF EXISTS public.bsk_holding_ledger CASCADE;

CREATE TABLE public.bsk_withdrawable_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_bsk NUMERIC NOT NULL,
  amount_inr NUMERIC NOT NULL,
  rate_snapshot NUMERIC NOT NULL,
  tx_type TEXT NOT NULL,
  tx_subtype TEXT,
  reference_id UUID,
  balance_before NUMERIC NOT NULL DEFAULT 0,
  balance_after NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  idempotency_key TEXT UNIQUE
);

CREATE INDEX idx_bsk_w_user ON public.bsk_withdrawable_ledger(user_id, created_at DESC);

CREATE TABLE public.bsk_holding_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_bsk NUMERIC NOT NULL,
  amount_inr NUMERIC NOT NULL,
  rate_snapshot NUMERIC NOT NULL,
  tx_type TEXT NOT NULL,
  tx_subtype TEXT,
  reference_id UUID,
  balance_before NUMERIC NOT NULL DEFAULT 0,
  balance_after NUMERIC NOT NULL,
  locked_until TIMESTAMPTZ,
  release_schedule_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  idempotency_key TEXT UNIQUE
);

CREATE INDEX idx_bsk_h_user ON public.bsk_holding_ledger(user_id, created_at DESC);

CREATE TABLE public.user_bsk_balance_summary (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  withdrawable_balance NUMERIC NOT NULL DEFAULT 0,
  holding_balance NUMERIC NOT NULL DEFAULT 0,
  lifetime_withdrawable_earned NUMERIC NOT NULL DEFAULT 0,
  lifetime_holding_earned NUMERIC NOT NULL DEFAULT 0,
  lifetime_withdrawn NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bsk_withdrawable_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bsk_holding_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bsk_balance_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_view_w" ON public.bsk_withdrawable_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_view_h" ON public.bsk_holding_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_view_sum" ON public.user_bsk_balance_summary FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_view_w" ON public.bsk_withdrawable_ledger FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin_view_h" ON public.bsk_holding_ledger FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin_view_sum" ON public.user_bsk_balance_summary FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "sys_ins_w" ON public.bsk_withdrawable_ledger FOR INSERT WITH CHECK (true);
CREATE POLICY "sys_ins_h" ON public.bsk_holding_ledger FOR INSERT WITH CHECK (true);