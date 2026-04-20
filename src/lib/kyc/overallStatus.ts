// Centralised "overall KYC status" logic combining the 3 pillars
// (documents / face / mobile) with the final approval state.
//
// Buckets (per spec):
//   - fully_approved   → docs + face + mobile all approved (and final not rejected)
//   - rejected         → final_status rejected, OR any pillar rejected and workflow closed
//   - partial          → at least one pillar approved but not all 3 (and not rejected)
//   - pending          → nothing approved yet (or only submissions, awaiting review)

export type PillarStatus =
  | 'approved'
  | 'rejected'
  | 'pending'
  | 'submitted'
  | 'under_review'
  | 'in_review'
  | 'needs_action'
  | 'not_started'
  | 'draft'
  | string
  | null
  | undefined;

export type OverallKYCStatus =
  | 'fully_approved'
  | 'partial'
  | 'pending'
  | 'rejected';

export interface OverallKYCInput {
  documents_status?: PillarStatus;
  face_status?: PillarStatus;
  mobile_status?: PillarStatus;
  final_status?: PillarStatus;
  display_status?: PillarStatus;
  status?: PillarStatus;
}

const isApproved = (s: PillarStatus) => s === 'approved';
const isRejected = (s: PillarStatus) => s === 'rejected';

export function computeOverallKYCStatus(input: OverallKYCInput): OverallKYCStatus {
  const docs = input.documents_status;
  const face = input.face_status;
  const mobile = input.mobile_status;
  const final = input.final_status;
  const display = input.display_status ?? input.status;

  // 1. Hard rejection wins
  if (isRejected(final) || display === 'rejected') return 'rejected';

  // 2. Fully approved — all 3 pillars green (final may still be pending submission to admin)
  if (isApproved(docs) && isApproved(face) && isApproved(mobile)) {
    // If admin has final-rejected after partial approvals, that's already caught above.
    return 'fully_approved';
  }

  // 3. Any pillar rejected with workflow closed → rejected
  // (workflow closed = final exists and is not pending/draft)
  if ((isRejected(docs) || isRejected(face) || isRejected(mobile)) && isRejected(final)) {
    return 'rejected';
  }

  // 4. At least one approved but not all → partial
  const approvedCount = [docs, face, mobile].filter(isApproved).length;
  if (approvedCount > 0) return 'partial';

  // 5. Default → pending
  return 'pending';
}

export interface OverallStatusUI {
  key: OverallKYCStatus;
  label: string;
  className: string; // tailwind classes for badge
  dotClassName: string;
}

export const OVERALL_STATUS_UI: Record<OverallKYCStatus, OverallStatusUI> = {
  fully_approved: {
    key: 'fully_approved',
    label: 'Fully Approved',
    className:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
    dotClassName: 'bg-emerald-500',
  },
  partial: {
    key: 'partial',
    label: 'Partially Approved',
    className:
      'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40',
    dotClassName: 'bg-blue-500',
  },
  pending: {
    key: 'pending',
    label: 'Pending',
    className:
      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
    dotClassName: 'bg-amber-500',
  },
  rejected: {
    key: 'rejected',
    label: 'Rejected',
    className:
      'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40',
    dotClassName: 'bg-red-500',
  },
};

export function pillarLabel(status: PillarStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'approved':
      return {
        label: 'Approved',
        className:
          'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        className:
          'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40',
      };
    case 'submitted':
    case 'under_review':
    case 'in_review':
    case 'pending':
      return {
        label: 'Pending review',
        className:
          'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
      };
    case 'needs_action':
      return {
        label: 'Needs action',
        className:
          'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40',
      };
    case 'not_started':
    case 'draft':
    case null:
    case undefined:
    case '':
      return {
        label: 'Not started',
        className:
          'bg-muted text-muted-foreground border-border',
      };
    default:
      return {
        label: String(status),
        className:
          'bg-muted text-muted-foreground border-border',
      };
  }
}

export interface OverallKYCStats {
  total: number;
  pending: number;
  partial: number;
  fully_approved: number;
  rejected: number;
  // step-level counters
  pending_docs: number;
  pending_face: number;
  pending_mobile: number;
  ready_for_final: number; // all 3 pillars approved but final not yet approved
}

export function computeOverallStats(
  rows: OverallKYCInput[],
): OverallKYCStats {
  const stats: OverallKYCStats = {
    total: rows.length,
    pending: 0,
    partial: 0,
    fully_approved: 0,
    rejected: 0,
    pending_docs: 0,
    pending_face: 0,
    pending_mobile: 0,
    ready_for_final: 0,
  };

  for (const r of rows) {
    const overall = computeOverallKYCStatus(r);
    stats[overall] += 1;

    // Step-level: count items that are NOT yet approved/rejected
    const isPillarPending = (s: PillarStatus) =>
      s !== 'approved' && s !== 'rejected';

    if (isPillarPending(r.documents_status)) stats.pending_docs += 1;
    if (isPillarPending(r.face_status)) stats.pending_face += 1;
    if (isPillarPending(r.mobile_status)) stats.pending_mobile += 1;

    // Ready for final = all 3 approved but final not approved yet
    if (
      r.documents_status === 'approved' &&
      r.face_status === 'approved' &&
      r.mobile_status === 'approved' &&
      r.final_status !== 'approved' &&
      r.final_status !== 'rejected'
    ) {
      stats.ready_for_final += 1;
    }
  }

  return stats;
}
