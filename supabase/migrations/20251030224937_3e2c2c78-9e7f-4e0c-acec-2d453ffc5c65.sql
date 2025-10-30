-- Fix search path for upsert_referral_tree function
CREATE OR REPLACE FUNCTION upsert_referral_tree(
  p_user_id UUID,
  p_tree_records JSONB
) RETURNS void AS $$
BEGIN
  -- Delete old records atomically
  DELETE FROM referral_tree WHERE user_id = p_user_id;
  
  -- Insert new records (all at once, atomic)
  INSERT INTO referral_tree (user_id, ancestor_id, level, path, direct_sponsor_id)
  SELECT 
    (rec->>'user_id')::UUID,
    (rec->>'ancestor_id')::UUID,
    (rec->>'level')::INT,
    ARRAY(SELECT jsonb_array_elements_text(rec->'path'))::UUID[],
    (rec->>'direct_sponsor_id')::UUID
  FROM jsonb_array_elements(p_tree_records) AS rec;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;