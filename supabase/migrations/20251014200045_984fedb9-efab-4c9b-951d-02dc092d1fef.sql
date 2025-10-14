-- Update WhatsApp template in mobile_linking_settings with rich personalized template
UPDATE mobile_linking_settings 
SET whatsapp_template = '🌟 *Join I-SMART Exchange!* 🌟

Hey! I''m earning crypto rewards with I-SMART Exchange. Join me! 💎

💰 *Why You''ll Love It:*
✅ Trade IPG, BTC, ETH, USDT & more
✅ Earn BSK tokens on every trade
✅ Multi-level referral rewards
✅ Secure wallet with biometric protection
✅ Daily reward programs & lucky draws

🎁 *YOUR REFERRAL CODE:*
{CODE}

📱 *How to Join (3 Easy Steps):*
1️⃣ Download I-SMART Exchange app:
   [APK DOWNLOAD LINK - Coming Soon]

2️⃣ Sign up with your email

3️⃣ Enter referral code: {CODE}
   (Enter it during verification to get bonuses!)

💪 I''ve helped {TOTAL_REFERRALS} friends join!

Referred by: {REFERRER_NAME}

Start earning together! 🚀
#CryptoTrading #ISMART #ReferralRewards',
  updated_at = now()
WHERE id = (SELECT id FROM mobile_linking_settings ORDER BY created_at DESC LIMIT 1);