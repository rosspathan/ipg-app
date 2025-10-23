-- Update IPG contract address in assets table
UPDATE assets 
SET contract_address = '0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E',
    updated_at = now()
WHERE symbol = 'IPG';

-- Update IPG contract address in ipg_admin_settings table
UPDATE ipg_admin_settings 
SET contract_address = '0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E',
    updated_at = now();