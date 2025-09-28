-- Add test BSK balance for user to test spin functionality
INSERT INTO public.user_bsk_balances (user_id, withdrawable_balance, total_earned_withdrawable)
VALUES ('63f85e16-73e8-4a8d-aafa-b23611e7cb61', 1000.0, 1000.0)
ON CONFLICT (user_id) 
DO UPDATE SET
  withdrawable_balance = 1000.0,
  total_earned_withdrawable = 1000.0,
  updated_at = now();