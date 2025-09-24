-- Update spin_settings to have 0 cooldown by default as requested
UPDATE spin_settings SET cooldown_seconds = 0 WHERE id IN (
  SELECT id FROM spin_settings ORDER BY created_at DESC LIMIT 1
);

-- Ensure we have the correct segments structure in spin_settings
UPDATE spin_settings SET segments = '[
  {"color": "#00ff88", "label": "WIN 5 BSK", "weight": 25, "reward_token": "BSK", "reward_value": 5},
  {"color": "#ff0066", "label": "LOSE 5 BSK", "weight": 25, "reward_token": "BSK", "reward_value": -5},
  {"color": "#00ff88", "label": "WIN 5 BSK", "weight": 25, "reward_token": "BSK", "reward_value": 5},
  {"color": "#ff0066", "label": "LOSE 5 BSK", "weight": 25, "reward_token": "BSK", "reward_value": -5}
]'::jsonb WHERE id IN (
  SELECT id FROM spin_settings ORDER BY created_at DESC LIMIT 1
);