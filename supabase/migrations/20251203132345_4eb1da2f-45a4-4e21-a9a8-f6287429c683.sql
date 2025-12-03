-- Archive duplicate program entries to prevent showing twice in UI
-- Keep entries with keys: lucky_draw, spin_wheel, bsk_loans (correct routes)
-- Archive entries with keys: lucky-draw, spin-wheel, bsk-loans (duplicates)

UPDATE program_modules 
SET status = 'archived', updated_at = now()
WHERE key IN ('lucky-draw', 'spin-wheel', 'bsk-loans')
  AND status != 'archived';