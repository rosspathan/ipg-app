-- Fix search_path security warnings for Phase 2 functions

ALTER FUNCTION check_single_active_subscription() SET search_path = public;
ALTER FUNCTION auto_flag_lucky_draw_full() SET search_path = public;