-- Insert the missed deposit record for tx sent to old hot wallet
INSERT INTO public.custodial_deposits (
  tx_hash,
  user_id,
  asset_id,
  amount,
  from_address,
  status,
  confirmations,
  required_confirmations,
  created_at,
  updated_at
) VALUES (
  '0xf0c8de6dccf2569ecd7483168f5aa7687155c38d3da4dc891872c5386ac071eb',
  '74852950-2a85-4079-8d28-877e561c255a',
  'ddee3f1f-3542-4c5e-870d-8ccf6ec8bbd0',
  21.26612124,
  '0x97e07a738600a6f13527fae0cacb0a592fbeafb1',
  'pending',
  999,
  15,
  now(),
  now()
);

-- Now credit it using the atomic RPC
DO $$
DECLARE
  v_deposit_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_deposit_id
  FROM public.custodial_deposits
  WHERE tx_hash = '0xf0c8de6dccf2569ecd7483168f5aa7687155c38d3da4dc891872c5386ac071eb';

  v_result := public.credit_custodial_deposit(v_deposit_id);
  RAISE NOTICE 'Credit result: %', v_result;
END;
$$;