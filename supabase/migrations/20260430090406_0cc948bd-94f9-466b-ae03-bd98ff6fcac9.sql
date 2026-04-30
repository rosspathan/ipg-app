WITH stuck AS (
  SELECT k.user_id, k.id AS profile_id
  FROM public.kyc_profiles_new k
  WHERE (k.status = 'rejected' OR k.final_status = 'rejected')
    AND (k.documents_status IN ('pending_review','not_submitted')
      OR k.face_status      IN ('pending_review','not_submitted')
      OR k.mobile_status    IN ('pending_review','not_submitted'))
)
UPDATE public.kyc_profiles_new k
SET documents_status = 'needs_resubmission'::public.kyc_pillar_status,
    face_status      = 'needs_resubmission'::public.kyc_pillar_status,
    mobile_status    = 'needs_resubmission'::public.kyc_pillar_status,
    final_status     = 'not_started'::public.kyc_status_v2,
    status           = 'rejected',
    resubmission_allowed = true,
    rejection_reason = COALESCE(k.rejection_reason, 'Please resubmit your KYC — your previous submission was reset by an administrator.'),
    updated_at = now()
FROM stuck
WHERE k.id = stuck.profile_id;

INSERT INTO public.kyc_decision_audit (
  user_id, submission_id, pillar, action, status_before, status_after, notes, admin_id, created_at
)
SELECT k.user_id, k.id, p.pillar, 'request_resubmission', 'pending_review', 'needs_resubmission',
       'Bulk unblock of stuck KYC submissions (April 2026 cleanup).',
       NULL, now()
FROM public.kyc_profiles_new k
CROSS JOIN (VALUES ('documents'),('face'),('mobile')) AS p(pillar)
WHERE k.user_id IN (
  '60fb7bbe-6040-41a1-a793-85fa9affac01',
  '8c471252-2116-460c-aa08-4b3acb6427c6',
  '31fdda89-a4cd-4146-b6ca-14020c7c8825',
  'e46a0909-9729-4553-9017-0e6a73b824d7',
  '31364d6d-08e6-4d35-b18c-1c65cca37fa3',
  '73c18943-2d36-45ff-81aa-d2e38f09a86b',
  '75e1c8a6-19a5-41e3-9d4e-e5757f94fe3d',
  '0e057250-68d1-4362-ac55-94187536765a',
  '36a55640-da73-43a5-a544-93e5ec504e7c'
);

UPDATE public.profiles
SET kyc_status = 'rejected', updated_at = now()
WHERE user_id IN (
  '60fb7bbe-6040-41a1-a793-85fa9affac01',
  '8c471252-2116-460c-aa08-4b3acb6427c6',
  '31fdda89-a4cd-4146-b6ca-14020c7c8825',
  'e46a0909-9729-4553-9017-0e6a73b824d7',
  '31364d6d-08e6-4d35-b18c-1c65cca37fa3',
  '73c18943-2d36-45ff-81aa-d2e38f09a86b',
  '75e1c8a6-19a5-41e3-9d4e-e5757f94fe3d',
  '0e057250-68d1-4362-ac55-94187536765a',
  '36a55640-da73-43a5-a544-93e5ec504e7c',
  '9e78164d-9f0e-4963-aa46-0b43fee5d1e2'
);