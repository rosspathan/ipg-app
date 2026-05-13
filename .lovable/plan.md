## KYC End-to-End Repair Plan

This plan rebuilds the KYC submission/resubmission loop end-to-end. It is split into a **diagnosis** phase (read-only, produces a written report you'll see in chat) and a **fix** phase (migrations + code). Nothing destructive runs until you approve the migration.

---

### Phase 0 — Current state (already partially audited)

Tables in `public.*` involved:
- `kyc_profiles_new` — **active source of truth** (3-pillar model: documents / face / mobile + final). Has per-pillar `*_status`, `*_notes`, `*_reviewed_*`, plus `final_status`, `resubmission_allowed`, `is_legacy`, `kyc_version`.
- `kyc_documents_new` — uploaded document rows.
- `kyc_decision_audit` — append-only audit log.
- `kyc_admin_notifications` — per-pillar admin queue.
- `kyc_admin_summary` — view used by `AdminKYCReview`.
- `kyc_phone_override_log`, `kyc_legacy_archive` — admin tools / history.
- `kyc_profiles` (legacy 1-pillar) and `kyc_submissions_simple` (legacy) — **must be retired from runtime reads**, kept for audit only (per memory: `useKYCSimple` is already deprecated).

RPCs that exist: `submit_kyc_l1`, `admin_update_kyc_pillar`, `admin_reset_kyc_phone`, `is_kyc_approved`, `enforce_kyc_state_machine` (trigger), `sync_kyc_approval_status`, `sync_kyc_to_profiles_new`, `reward_kyc_approval`, `kyc_protect_submitted_data`, `check_kyc_phone_uniqueness`, `kyc_access_diagnostic`, `admin_kyc_access_check`.

Pillar enum statuses currently in use (from `kyc_profiles_new.*_status`): `not_submitted`, `submitted`, `pending_review`, `approved`, `rejected`, `needs_resubmission`. Final status enum includes additionally: `not_started`, `documents_under_review`, `face_pending`, `face_verified`, `mobile_pending_admin_verification`, `mobile_verified`, `suspended`.

Storage buckets used: `kyc` (private, used by `useKYC.uploadFile`) and `kyc-documents` (public, used by legacy `useKYCSimple`). The active wizard uses `kyc` via signed URLs.

---

### Phase 1 — Diagnosis report (read-only, no DB writes)

I'll dump (and post the findings inline in chat — not as a code change):
1. Row counts per status per pillar in `kyc_profiles_new`, plus how many users have a `final_status='approved'` but a pillar still `pending_review` (the "approved-but-locked" symptom).
2. Users where `final_status='rejected'` or any pillar `rejected` but `resubmission_allowed=false` (the "stuck" symptom).
3. The body of `enforce_kyc_state_machine`, `kyc_protect_submitted_data`, `submit_kyc_l1`, `admin_update_kyc_pillar`, `sync_kyc_approval_status`, plus all triggers on `kyc_profiles_new`. These are the most likely sources of the "can't resubmit" bug.
4. RLS policy matrix on `kyc_profiles_new`, `kyc_documents_new`, and storage objects in bucket `kyc`.
5. `KYCWizard` + `KYCStepDocuments`/`SelfieCapture`/mobile step gating logic — where the UI decides whether to show "Resubmit" vs "Under review".
6. `AdminKYCReview` action handlers — where buttons get disabled.
7. Edge function `process-kyc-user-reward` — confirm it only runs on transition to fully approved.

You'll get a short written audit summarising: which trigger blocks resubmission, which RLS rule blocks admin image preview, which UI condition mislabels the pillar, which code path does not refresh after admin action. **No code or DB changes happen in Phase 1.**

---

### Phase 2 — State-machine fix (migration, requires your approval)

Single migration that makes the state machine correct and idempotent.

**A. Per-pillar enum normalisation.** Each pillar uses exactly:
`not_submitted → submitted → approved | rejected`. `rejected` is **always** resubmittable by the user (no separate `needs_resubmission`; we collapse the two — `needs_resubmission` becomes an alias kept only for back-compat reads).

**B. `final_status` derivation.** Becomes a generated/enforced status driven only by the three pillars:
- All three `approved` → `approved`
- Any `rejected` → `rejected` (with `resubmission_allowed=true`)
- Any `submitted` and none `rejected` → `pending_review`
- Otherwise → `not_started`

Implemented as a `BEFORE INSERT/UPDATE` trigger that recomputes `final_status` from the pillars; this kills the "user side says Resubmission required but pillar says Under review" desync at the source.

**C. Resubmission rules.** Replace any trigger code that blocks UPDATE when `*_status='rejected'`. The new rule: a user may UPDATE their own row only to:
- move pillar from `not_submitted | rejected` → `submitted` (with new payload), OR
- replace pillar payload while pillar is `rejected`.

A user may **never** flip a pillar to `approved`. Admins (via `admin_update_kyc_pillar` SECURITY DEFINER) may move pillar `submitted → approved | rejected`.

**D. Latest-submission concept.** Each pillar gets a `*_submission_seq integer` counter that increments on every user resubmit. `kyc_decision_audit` already keeps the full history. Admin queue queries filter to pillars whose `*_status='submitted'` (i.e., latest pending). Approved users are excluded by definition.

**E. RLS hardening + admin image access.**
- `kyc_profiles_new`: SELECT own + admin; UPDATE own *only* on resubmittable transitions (enforced by trigger above); admin UPDATE via SECURITY DEFINER RPC only.
- `kyc_documents_new`: same shape; admin SELECT confirmed.
- `storage.objects` bucket `kyc`: add admin SELECT policy (`has_role(auth.uid(),'admin')`). The wizard already generates signed URLs for the user; admin reads use a new `admin_kyc_signed_url(path)` RPC (SECURITY DEFINER) so admin previews never depend on bucket-publicity.

**F. Idempotency.** `submit_kyc_l1` and `admin_update_kyc_pillar` wrapped in `SELECT … FOR UPDATE` on the user's row, so double-clicks can't race.

**G. Reward trigger.** `reward_kyc_approval` only fires on the explicit transition `final_status: !=approved → approved`, with a one-shot `final_approved_at IS NULL` guard. Already partially done (per memory) — re-verified.

---

### Phase 3 — Code changes (frontend + edge)

Frontend (no business logic in components — they call RPCs):

- `src/components/kyc/KYCWizard.tsx` + step components: drive every per-pillar CTA from `useKycGate()` only. Mapping:
  - pillar `not_submitted` → "Start"
  - pillar `submitted` → "Under admin review" (read-only)
  - pillar `approved` → green check, locked for user
  - pillar `rejected` → red banner with `*_notes`, **"Resubmit"** CTA enabled
- `src/hooks/useKYCStatus.ts` + `useKycGate.ts`: collapse `needs_resubmission`/`rejected` into the same UX state. Headline driven by the *first non-approved* pillar.
- New `src/components/kyc/PillarStatusCard.tsx` to render a single source of truth per pillar (used by both user wizard and admin panel for visual parity).
- `src/pages/AdminKYCReview.tsx`: action buttons disabled rule becomes simply `pillar.status !== 'submitted'`. Adds Approve / Reject (with mandatory note) / Request resubmission (= reject with a templated note). All actions go through `admin_update_kyc_pillar`. Final approve button enabled only when all three pillars are `approved`.
- Replace generic `toast.error("Something went wrong")` with the RPC's `error.message` (RPCs raise `RAISE EXCEPTION USING MESSAGE = 'KYC_PILLAR_LOCKED: …'` etc.).
- Loading + success toasts on every action; buttons disabled during in-flight mutation; React Query invalidation of `['kyc-status']`, `['admin-kyc']`, `['admin-kyc-diagnostics']` after each action.
- Mobile preview: admin review screen wrapped in `overflow-x-auto` containers and the action bar pinned with `sticky bottom-0` so no buttons get clipped at narrow widths.

Deprecate (read-only, type-only imports remain):
- `useKYCSimple`, `useKYC` (legacy 1-pillar). Add a runtime warning if anything calls them.

Edge:
- `process-kyc-user-reward` — confirm idempotent (already triggered from `reward_kyc_approval`); add a guard log if invoked while `final_status != 'approved'`.

---

### Phase 4 — Verification matrix (testing proof)

After the migration is approved I will run each scenario against the live DB using `supabase--read_query` + `supabase--migration` (data ops via insert tool / RPC calls), and post a table in chat with PASS/FAIL for each:

1. New user submits all 3 pillars → all become `submitted`, `final_status='pending_review'`.
2. Admin approves documents, rejects mobile → documents `approved`, mobile `rejected`, final `rejected`, `resubmission_allowed=true`.
3. User resubmits mobile only → mobile `submitted`, documents stays `approved`, final `pending_review`.
4. Admin queue shows the new mobile submission as the only actionable row for that user.
5. Admin approves new mobile + remaining face → final `approved`, reward fires once.
6. Admin rejects documents on a different user → user can re-upload, no DB error.
7. Admin rejects face → user can recapture selfie, no DB error.
8. "Request resubmission" pathway = reject-with-note; user sees the note + Resubmit CTA.
9. Approved user no longer appears in `admin_kyc_summary` pending queue.
10. Rejected user always has `resubmission_allowed=true` and is reachable from /app/profile/kyc.
11. Old `kyc_profiles` / `kyc_submissions_simple` rows remain untouched (history preserved).
12. Admin loads a signed URL for a document via the new `admin_kyc_signed_url` RPC — image renders.
13. Mobile-preview screenshot of `AdminKYCReview` at 390 px width — buttons visible, no overflow.
14. Direct REST call as a non-admin trying `admin_update_kyc_pillar` → `42501 permission denied` (proves bypass blocked).

Anything that fails I'll fix in a follow-up migration before declaring done.

---

### Out of scope for this pass

- Adding a 4th pillar (e.g. address proof) — keep current 3-pillar model.
- New region-specific KYC schemas (`kyc_admin_config.region_rules`).
- Rebuilding the legacy `kyc_profiles` table — left as audit-only.

---

**To start, I need your approval to:**
1. Run Phase 1 (read-only diagnosis, posts findings inline) — no risk.
2. Then propose the Phase 2 migration for your explicit approval before any DB change.

Reply "go" to proceed with Phase 1, or tell me which parts of the plan to adjust first.