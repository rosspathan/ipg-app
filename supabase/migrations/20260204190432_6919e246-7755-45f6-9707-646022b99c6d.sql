-- Fix incomplete settlement for loan BSK88478041ABOE
-- Settlement was taken but installments not marked as paid

UPDATE bsk_loan_installments
SET status = 'paid', paid_at = '2026-02-04 18:56:45+00'
WHERE loan_id = 'e286eb38-43df-41a9-ac3a-a7126e316677' 
  AND status IN ('due', 'overdue');