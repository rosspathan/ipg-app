
DELETE FROM auth.identities WHERE user_id = '105a8811-2c93-428a-9979-e44a1022fe95';
DELETE FROM auth.sessions WHERE user_id = '105a8811-2c93-428a-9979-e44a1022fe95';
DELETE FROM auth.refresh_tokens WHERE user_id::uuid = '105a8811-2c93-428a-9979-e44a1022fe95';
