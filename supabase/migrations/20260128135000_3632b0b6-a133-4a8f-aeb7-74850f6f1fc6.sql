BEGIN;

-- Ensure the loan program module cannot appear in user program lists
UPDATE public.program_modules
SET status = 'archived',
    updated_at = now()
WHERE key IN ('bsk_loans', 'bsk-loans', 'loans');

COMMIT;