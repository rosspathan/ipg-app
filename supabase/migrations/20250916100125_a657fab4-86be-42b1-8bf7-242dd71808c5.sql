-- Create user achievements tracking table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_type TEXT NOT NULL,
  unlocked BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily rewards tracking table
CREATE TABLE public.daily_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_in_cycle INTEGER NOT NULL,
  streak_day INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  reward_amount NUMERIC NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user gamification stats table
CREATE TABLE public.user_gamification_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_login_streak INTEGER NOT NULL DEFAULT 0,
  longest_login_streak INTEGER NOT NULL DEFAULT 0,
  total_achievements_unlocked INTEGER NOT NULL DEFAULT 0,
  total_rewards_claimed INTEGER NOT NULL DEFAULT 0,
  last_daily_reward_claim DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_achievements
CREATE POLICY "Users can view own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage all achievements" 
ON public.user_achievements 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for daily_rewards
CREATE POLICY "Users can view own rewards" 
ON public.daily_rewards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can claim own rewards" 
ON public.daily_rewards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage all rewards" 
ON public.daily_rewards 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for user_gamification_stats
CREATE POLICY "Users can view own stats" 
ON public.user_gamification_stats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" 
ON public.user_gamification_stats 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all stats" 
ON public.user_gamification_stats 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_type ON public.user_achievements(achievement_type);
CREATE INDEX idx_daily_rewards_user_id ON public.daily_rewards(user_id);
CREATE INDEX idx_daily_rewards_claimed_at ON public.daily_rewards(claimed_at);
CREATE INDEX idx_user_gamification_stats_user_id ON public.user_gamification_stats(user_id);

-- Create function to update gamification stats
CREATE OR REPLACE FUNCTION public.update_gamification_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update achievement count when new achievement is unlocked
  IF TG_TABLE_NAME = 'user_achievements' AND NEW.unlocked = true THEN
    INSERT INTO public.user_gamification_stats (user_id, total_achievements_unlocked)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_achievements_unlocked = user_gamification_stats.total_achievements_unlocked + 1,
      total_xp = user_gamification_stats.total_xp + NEW.points_earned,
      level = GREATEST(1, (user_gamification_stats.total_xp + NEW.points_earned) / 100 + 1),
      updated_at = now();
  END IF;

  -- Update reward count when new reward is claimed
  IF TG_TABLE_NAME = 'daily_rewards' THEN
    INSERT INTO public.user_gamification_stats (user_id, total_rewards_claimed, last_daily_reward_claim)
    VALUES (NEW.user_id, 1, CURRENT_DATE)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_rewards_claimed = user_gamification_stats.total_rewards_claimed + 1,
      last_daily_reward_claim = CURRENT_DATE,
      current_login_streak = NEW.streak_day,
      longest_login_streak = GREATEST(user_gamification_stats.longest_login_streak, NEW.streak_day),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers to update gamification stats
CREATE TRIGGER update_achievement_stats
  AFTER INSERT OR UPDATE ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gamification_stats();

CREATE TRIGGER update_reward_stats
  AFTER INSERT ON public.daily_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gamification_stats();