-- Phase 3: User Program Participation & State Management

-- Create user_program_states table to track user participation
CREATE TABLE IF NOT EXISTS public.user_program_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES public.program_modules(id) ON DELETE CASCADE,
  
  -- State tracking
  status TEXT NOT NULL DEFAULT 'not_started',
  -- Status: not_started, active, paused, completed, failed, expired
  
  progress_data JSONB DEFAULT '{}'::jsonb,
  -- Stores: current_step, completion_percentage, checkpoints, etc.
  
  participation_count INTEGER DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  
  -- Timestamps
  first_participated_at TIMESTAMP WITH TIME ZONE,
  last_participated_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, module_id)
);

-- Create user_program_participations table for individual participation events
CREATE TABLE IF NOT EXISTS public.user_program_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES public.program_modules(id) ON DELETE CASCADE,
  state_id UUID REFERENCES public.user_program_states(id) ON DELETE CASCADE,
  
  -- Participation details
  participation_type TEXT NOT NULL,
  -- Type: entry, spin, draw_ticket, claim, stake, etc.
  
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  
  -- Results
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status: pending, processing, completed, failed
  
  outcome TEXT,
  -- Outcome: win, loss, partial, etc.
  
  rewards JSONB DEFAULT '[]'::jsonb,
  -- Array of rewards: [{type: 'bsk', amount: 100}, {type: 'badge', name: 'gold'}]
  
  -- Financial
  amount_paid NUMERIC DEFAULT 0,
  amount_earned NUMERIC DEFAULT 0,
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verification_data JSONB,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create user_program_progress table for milestone tracking
CREATE TABLE IF NOT EXISTS public.user_program_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES public.program_modules(id) ON DELETE CASCADE,
  state_id UUID REFERENCES public.user_program_states(id) ON DELETE CASCADE,
  
  -- Progress tracking
  milestone_key TEXT NOT NULL,
  milestone_type TEXT NOT NULL,
  -- Type: level, achievement, streak, threshold
  
  current_value NUMERIC DEFAULT 0,
  target_value NUMERIC NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, module_id, milestone_key)
);

-- Enable RLS
ALTER TABLE public.user_program_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_program_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_program_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_program_states
CREATE POLICY "Users can view own program states"
  ON public.user_program_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own program states"
  ON public.user_program_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own program states"
  ON public.user_program_states FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all program states"
  ON public.user_program_states FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_program_participations
CREATE POLICY "Users can view own participations"
  ON public.user_program_participations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own participations"
  ON public.user_program_participations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all participations"
  ON public.user_program_participations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage all participations"
  ON public.user_program_participations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_program_progress
CREATE POLICY "Users can view own progress"
  ON public.user_program_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.user_program_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.user_program_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all progress"
  ON public.user_program_progress FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_user_program_states_user_id ON public.user_program_states(user_id);
CREATE INDEX idx_user_program_states_module_id ON public.user_program_states(module_id);
CREATE INDEX idx_user_program_states_status ON public.user_program_states(status);

CREATE INDEX idx_user_program_participations_user_id ON public.user_program_participations(user_id);
CREATE INDEX idx_user_program_participations_module_id ON public.user_program_participations(module_id);
CREATE INDEX idx_user_program_participations_state_id ON public.user_program_participations(state_id);
CREATE INDEX idx_user_program_participations_status ON public.user_program_participations(status);
CREATE INDEX idx_user_program_participations_started_at ON public.user_program_participations(started_at DESC);

CREATE INDEX idx_user_program_progress_user_id ON public.user_program_progress(user_id);
CREATE INDEX idx_user_program_progress_module_id ON public.user_program_progress(module_id);
CREATE INDEX idx_user_program_progress_state_id ON public.user_program_progress(state_id);

-- Create function to update user_program_states updated_at
CREATE OR REPLACE FUNCTION update_user_program_states_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_user_program_states_updated_at
  BEFORE UPDATE ON public.user_program_states
  FOR EACH ROW
  EXECUTE FUNCTION update_user_program_states_updated_at();

CREATE TRIGGER update_user_program_progress_updated_at
  BEFORE UPDATE ON public.user_program_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to initialize user program state
CREATE OR REPLACE FUNCTION public.initialize_user_program_state(
  p_user_id UUID,
  p_module_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state_id UUID;
BEGIN
  -- Check if state already exists
  SELECT id INTO v_state_id
  FROM user_program_states
  WHERE user_id = p_user_id AND module_id = p_module_id;
  
  IF v_state_id IS NULL THEN
    -- Create new state
    INSERT INTO user_program_states (user_id, module_id, status)
    VALUES (p_user_id, p_module_id, 'not_started')
    RETURNING id INTO v_state_id;
  END IF;
  
  RETURN v_state_id;
END;
$$;

-- Create function to record participation
CREATE OR REPLACE FUNCTION public.record_program_participation(
  p_user_id UUID,
  p_module_id UUID,
  p_participation_type TEXT,
  p_input_data JSONB DEFAULT '{}'::jsonb,
  p_output_data JSONB DEFAULT '{}'::jsonb,
  p_amount_paid NUMERIC DEFAULT 0,
  p_amount_earned NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state_id UUID;
  v_participation_id UUID;
BEGIN
  -- Get or create state
  v_state_id := initialize_user_program_state(p_user_id, p_module_id);
  
  -- Create participation record
  INSERT INTO user_program_participations (
    user_id, module_id, state_id, participation_type,
    input_data, output_data, amount_paid, amount_earned,
    status
  ) VALUES (
    p_user_id, p_module_id, v_state_id, p_participation_type,
    p_input_data, p_output_data, p_amount_paid, p_amount_earned,
    'completed'
  ) RETURNING id INTO v_participation_id;
  
  -- Update state
  UPDATE user_program_states
  SET 
    participation_count = participation_count + 1,
    total_spent = total_spent + p_amount_paid,
    total_earned = total_earned + p_amount_earned,
    last_participated_at = NOW(),
    first_participated_at = COALESCE(first_participated_at, NOW()),
    status = CASE 
      WHEN status = 'not_started' THEN 'active'
      ELSE status
    END
  WHERE id = v_state_id;
  
  RETURN v_participation_id;
END;
$$;