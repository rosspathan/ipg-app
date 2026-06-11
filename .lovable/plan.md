# Scratch Card — Live Rollout Plan

Your choices: **build code AND go live now**, cards issued **on referral signup**, payout **auto on claim**, reward **1–5 BSK**.

## What already exists (verified)
- DB schema, treasury invariant + phase-lock triggers.
- RPCs: `scratch_card_reveal`, `scratch_card_create_claim_batch`, `scratch_card_mark_broadcasting`, `scratch_card_confirm_batch`, `scratch_card_fail_batch`, admin config/overview.
- Edge functions: `scratch-claim-broadcaster` (real BSC signing path ready, gated by `SCRATCH_DRY_RUN`), `scratch-claim-confirmer` (real receipt polling ready).
- `SCRATCH_HOTWALLET_PRIVATE_KEY` secret stored. Hot wallet funded on-chain with test BNB + BSK.

## Gaps that must be built
1. **No card-creation path** — nothing issues a card on referral signup.
2. **No treasury-funding RPC** — the on-chain BSK in the hot wallet is NOT reflected in `scratch_card_treasury_balances`, so `available_bsk = 0` and every reveal becomes non-claimable `treasury_pending`.
3. **No auto-claim orchestration** — reveal → batch → broadcast → confirm is not chained for a user action.
4. **No user UI**.

## Build steps

### 1. Migration — card issuance on referral signup
- New `scratch_issue_card(p_user_id)` (SECURITY DEFINER, service_role/admin): inserts one `scratch_cards` row (`source='referral_signup'`, `status='unscratched'`), with a guard so the campaign must be enabled and one-card-per-referral (idempotent on the referee event).
- Trigger on `referral_links_new` (AFTER UPDATE OF `locked_at`, when `sponsor_id` is set and `locked_at` transitions to non-null): issues a card to the **sponsor** (referrer). De-dup via a unique key on (sponsor, referee) so a given referee only ever mints one card for the sponsor.
- Set reward range to 1–5 (already `min=1,max=5`; confirm only).

### 2. Migration — treasury funding RPC
- `scratch_fund_treasury_from_deposit(p_tx_hash, p_amount)` (admin/service_role): records a verified `scratch_card_funding_deposits` row and atomically `funded_bsk += amount`, `available_bsk += amount`, writes a `fund` ledger row (invariant preserved). This is how the on-chain hot-wallet BSK becomes claimable reserve. Admin-only, tx-verified.

### 3. Edge function — `scratch-claim` (auto on claim)
- Authenticated (validates caller JWT = card owner). Steps, server-side:
  1. `scratch_card_create_claim_batch([card_id])` as the user.
  2. Invoke `scratch-claim-broadcaster` internally → real signed BSC transfer (when `SCRATCH_DRY_RUN=false`).
  3. Return `batch_id` + `tx_hash`.
- Reveal stays a separate explicit user action (`scratch_card_reveal`); claim is the auto-broadcast step.

### 4. Confirmer cron
- Add a scheduled job (pg_cron + `net.http_post`) every ~1 min that calls `scratch-claim-confirmer` for each batch in `broadcasting` status, advancing it to `confirmed` (cards→claimed, treasury distribute) once ≥ `min_confirmations`.

### 5. User UI (`/app/scratch-cards`)
- Lists the user's cards; scratch-to-reveal animation; on reveal shows reward; "Claim to my wallet" button calls `scratch-claim`; shows tx status + BscScan link; reflects `treasury_pending` clearly when unbacked.
- Requires the user to have `profiles.wallet_address` + approved KYC (config `require_kyc=true`).

### 6. Go-live flip (sequenced, each gated)
- Migration: `launch_phase = 2`, then `is_enabled = true`, `campaign_start_at = now()`.
- Fund the treasury via step-2 RPC to match the on-chain BSK already in the wallet (amount you confirm).
- Flip `SCRATCH_DRY_RUN=false` via the secret form.

## Risks / decisions to confirm
- **Treasury funding amount**: how much BSK is currently in the hot wallet that I should record as funded/available? Until this is done, no live payout can occur.
- **Auto-broadcast on every claim** signs from the hot wallet on user action; safety caps in place: per-batch ≤ 25 BSK, BNB gas floor, key↔wallet address match, chainId 56, on-chain dedup. KYC + valid wallet required.
- **Per-user / global rate limits** for card issuance and reveals (recommend a daily cap) — confirm if you want limits beyond one-card-per-referral.

## Technical notes
- `enforce_scratch_config_phase_lock` blocks enabling while `launch_phase=1`; the flip migration sets phase 2 first, then enables, in one transaction.
- Sending BSK to `profiles.wallet_address` does not create a `custodial_deposit`; scanner dedups via `source='scratch_card_reward'` so no double credit.
- All treasury mutations keep `funded = available + claimable_reserved + distributed`.
