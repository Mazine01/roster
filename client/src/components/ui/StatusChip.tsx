import { STATUS_LABELS, type StudentStatus } from '@roster/shared';

const tones: Record<StudentStatus, string> = {
  ACTIVE: 'bg-ok-soft text-ok',
  GRADUATED: 'bg-brand-soft text-brand',
  SUSPENDED: 'bg-warn-soft text-warn',
  WITHDRAWN: 'bg-neutral-soft text-ink-muted',
};

const dots: Record<StudentStatus, string> = {
  ACTIVE: 'bg-ok',
  GRADUATED: 'bg-brand',
  SUSPENDED: 'bg-warn',
  WITHDRAWN: 'bg-ink-muted',
};

export function StatusChip({ status }: { status: StudentStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
