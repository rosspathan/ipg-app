-- Database functions for Lucky Draw and Loan Processing

-- Function to select lucky draw winners
CREATE OR REPLACE FUNCTION select_draw_winners(p_draw_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  draw_config RECORD;
  all_tickets UUID[];
  winner_tickets UUID[];
  first_place_ticket UUID;
  second_place_ticket UUID;
  third_place_ticket UUID;
  first_place_user UUID;
  second_place_user UUID;
  third_place_user UUID;
  admin_fee NUMERIC;
  result JSONB;
BEGIN
  -- Get draw configuration
  SELECT * INTO draw_config
  FROM draw_templates
  WHERE id = p_draw_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Draw not found or inactive');
  END IF;
  
  -- Get all pending tickets for this draw
  SELECT array_agg(id ORDER BY RANDOM())
  INTO all_tickets
  FROM lucky_draw_tickets
  WHERE config_id = p_draw_id AND status = 'pending';
  
  IF all_tickets IS NULL OR array_length(all_tickets, 1) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough participants');
  END IF;
  
  -- Randomly select 3 unique winners
  first_place_ticket := all_tickets[1];
  second_place_ticket := all_tickets[2];
  third_place_ticket := all_tickets[3];
  
  -- Get user IDs
  SELECT user_id INTO first_place_user FROM lucky_draw_tickets WHERE id = first_place_ticket;
  SELECT user_id INTO second_place_user FROM lucky_draw_tickets WHERE id = second_place_ticket;
  SELECT user_id INTO third_place_user FROM lucky_draw_tickets WHERE id = third_place_ticket;
  
  -- Calculate admin fee
  admin_fee := (draw_config.first_place_prize_bsk + draw_config.second_place_prize_bsk + draw_config.third_place_prize_bsk) 
               * (draw_config.admin_fee_percent / 100);
  
  -- Credit prizes to winners (withdrawable balance)
  INSERT INTO user_bsk_balances (user_id, withdrawable_balance, total_earned_withdrawable)
  VALUES (first_place_user, draw_config.first_place_prize_bsk, draw_config.first_place_prize_bsk)
  ON CONFLICT (user_id) DO UPDATE SET
    withdrawable_balance = user_bsk_balances.withdrawable_balance + draw_config.first_place_prize_bsk,
    total_earned_withdrawable = user_bsk_balances.total_earned_withdrawable + draw_config.first_place_prize_bsk;
  
  INSERT INTO user_bsk_balances (user_id, withdrawable_balance, total_earned_withdrawable)
  VALUES (second_place_user, draw_config.second_place_prize_bsk, draw_config.second_place_prize_bsk)
  ON CONFLICT (user_id) DO UPDATE SET
    withdrawable_balance = user_bsk_balances.withdrawable_balance + draw_config.second_place_prize_bsk,
    total_earned_withdrawable = user_bsk_balances.total_earned_withdrawable + draw_config.second_place_prize_bsk;
  
  INSERT INTO user_bsk_balances (user_id, withdrawable_balance, total_earned_withdrawable)
  VALUES (third_place_user, draw_config.third_place_prize_bsk, draw_config.third_place_prize_bsk)
  ON CONFLICT (user_id) DO UPDATE SET
    withdrawable_balance = user_bsk_balances.withdrawable_balance + draw_config.third_place_prize_bsk,
    total_earned_withdrawable = user_bsk_balances.total_earned_withdrawable + draw_config.third_place_prize_bsk;
  
  -- Update winning tickets status
  UPDATE lucky_draw_tickets SET status = 'won', prize_amount = draw_config.first_place_prize_bsk WHERE id = first_place_ticket;
  UPDATE lucky_draw_tickets SET status = 'won', prize_amount = draw_config.second_place_prize_bsk WHERE id = second_place_ticket;
  UPDATE lucky_draw_tickets SET status = 'won', prize_amount = draw_config.third_place_prize_bsk WHERE id = third_place_ticket;
  
  -- Update all other tickets to lost
  UPDATE lucky_draw_tickets SET status = 'lost' WHERE config_id = p_draw_id AND status = 'pending';
  
  -- Create draw result record
  INSERT INTO draw_results (
    template_id,
    first_place_user_id,
    second_place_user_id,
    third_place_user_id,
    first_place_prize_bsk,
    second_place_prize_bsk,
    third_place_prize_bsk,
    admin_fee_bsk,
    total_participants,
    executed_at
  ) VALUES (
    p_draw_id,
    first_place_user,
    second_place_user,
    third_place_user,
    draw_config.first_place_prize_bsk,
    draw_config.second_place_prize_bsk,
    draw_config.third_place_prize_bsk,
    admin_fee,
    array_length(all_tickets, 1),
    NOW()
  );
  
  -- Create bonus ledger entries for winners
  INSERT INTO bonus_ledger (user_id, type, amount_bsk, meta_json)
  VALUES 
    (first_place_user, 'lucky_draw_win', draw_config.first_place_prize_bsk, jsonb_build_object('draw_id', p_draw_id, 'position', 1)),
    (second_place_user, 'lucky_draw_win', draw_config.second_place_prize_bsk, jsonb_build_object('draw_id', p_draw_id, 'position', 2)),
    (third_place_user, 'lucky_draw_win', draw_config.third_place_prize_bsk, jsonb_build_object('draw_id', p_draw_id, 'position', 3));
  
  result := jsonb_build_object(
    'success', true,
    'draw_id', p_draw_id,
    'first_place', jsonb_build_object('user_id', first_place_user, 'prize', draw_config.first_place_prize_bsk),
    'second_place', jsonb_build_object('user_id', second_place_user, 'prize', draw_config.second_place_prize_bsk),
    'third_place', jsonb_build_object('user_id', third_place_user, 'prize', draw_config.third_place_prize_bsk),
    'total_participants', array_length(all_tickets, 1),
    'admin_fee', admin_fee
  );
  
  RETURN result;
END;
$$;

-- Function to process overdue loan payments
CREATE OR REPLACE FUNCTION process_overdue_loan_payments()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  loan_record RECORD;
  installment_record RECORD;
  user_balance NUMERIC;
  payment_amount NUMERIC;
  late_fee NUMERIC;
  total_amount NUMERIC;
  payments_processed INTEGER := 0;
  result JSONB;
BEGIN
  -- Find all active loans with overdue installments
  FOR installment_record IN
    SELECT i.*, l.user_id, l.interest_rate_percent, l.late_fee_percent
    FROM bsk_loan_installments i
    JOIN bsk_loans l ON i.loan_id = l.id
    WHERE i.status = 'pending'
      AND i.due_date < CURRENT_DATE
      AND l.status = 'active'
    ORDER BY i.due_date ASC
  LOOP
    -- Get user's withdrawable balance
    SELECT COALESCE(withdrawable_balance, 0) INTO user_balance
    FROM user_bsk_balances
    WHERE user_id = installment_record.user_id;
    
    -- Calculate late fee (if applicable)
    late_fee := 0;
    IF installment_record.due_date < CURRENT_DATE - INTERVAL '7 days' THEN
      late_fee := installment_record.amount * (installment_record.late_fee_percent / 100);
    END IF;
    
    total_amount := installment_record.amount + late_fee;
    
    -- Check if user has sufficient balance
    IF user_balance >= total_amount THEN
      -- Deduct from user's withdrawable balance
      UPDATE user_bsk_balances
      SET withdrawable_balance = withdrawable_balance - total_amount
      WHERE user_id = installment_record.user_id;
      
      -- Mark installment as paid
      UPDATE bsk_loan_installments
      SET 
        status = 'paid',
        paid_at = NOW(),
        late_fee_bsk = late_fee
      WHERE id = installment_record.id;
      
      -- Create payment record
      INSERT INTO bsk_loan_payments (
        loan_id,
        installment_id,
        user_id,
        amount_bsk,
        late_fee_bsk,
        payment_method
      ) VALUES (
        installment_record.loan_id,
        installment_record.id,
        installment_record.user_id,
        installment_record.amount,
        late_fee,
        'auto_debit'
      );
      
      -- Create bonus ledger entry
      INSERT INTO bonus_ledger (user_id, type, amount_bsk, meta_json)
      VALUES (
        installment_record.user_id,
        'loan_payment',
        -total_amount,
        jsonb_build_object(
          'loan_id', installment_record.loan_id,
          'installment_id', installment_record.id,
          'principal', installment_record.amount,
          'late_fee', late_fee,
          'auto_processed', true
        )
      );
      
      payments_processed := payments_processed + 1;
      
      -- Check if this was the last installment
      IF NOT EXISTS (
        SELECT 1 FROM bsk_loan_installments
        WHERE loan_id = installment_record.loan_id AND status = 'pending'
      ) THEN
        -- Mark loan as completed
        UPDATE bsk_loans
        SET 
          status = 'completed',
          completed_at = NOW()
        WHERE id = installment_record.loan_id;
      END IF;
    ELSE
      -- Insufficient balance, mark as overdue
      UPDATE bsk_loan_installments
      SET status = 'overdue'
      WHERE id = installment_record.id;
    END IF;
  END LOOP;
  
  result := jsonb_build_object(
    'success', true,
    'payments_processed', payments_processed,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$;