import type { Stats } from '@roster/shared';

const SHADES = [1, 0.78, 0.6, 0.45, 0.32, 0.22];

interface Props {
  stats: Stats | undefined;
  selectedProgramId?: number;
  onSelectProgram: (programId: number | undefined) => void;
}

export function EnrollmentStrip({ stats, selectedProgramId, onSelectProgram }: Props) {
  if (!stats) {
    return <div className="h-[132px] animate-pulse rounded-panel bg-sunken" aria-hidden="true" />;
  }

  const total = Math.max(stats.total, 1);
  const programs = stats.byProgram.filter((p) => p.count > 0);
  const toggle = (id: number) => onSelectProgram(selectedProgramId === id ? undefined : id);

  return (
    <section aria-labelledby="enrollment-heading" className="rounded-panel border border-rule bg-surface px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <h2 id="enrollment-heading" className="text-sm font-semibold text-ink">
          Enrollment by program
        </h2>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <Fact label="Active" value={stats.byStatus.ACTIVE} />
          <Fact label="Graduated" value={stats.byStatus.GRADUATED} />
          <Fact label="Suspended" value={stats.byStatus.SUSPENDED} />
          <Fact label="Average GPA, active" value={stats.averageGpa?.toFixed(2) ?? '–'} />
        </dl>
      </div>

      <div className="mt-4 flex h-7 w-full gap-[2px] overflow-hidden rounded-control" role="group" aria-label="Students per program">
        {programs.map((p, i) => {
          const selected = selectedProgramId === p.programId;
          const dimmed = selectedProgramId !== undefined && !selected;
          return (
            <button
              key={p.programId}
              type="button"
              onClick={() => toggle(p.programId)}
              aria-pressed={selected}
              title={`${p.name}: ${p.count} students`}
              style={{
                width: `${(p.count / total) * 100}%`,
                backgroundColor: selected ? 'rgb(var(--highlight))' : `rgb(var(--brand) / ${SHADES[i] ?? 0.2})`,
                opacity: dimmed ? 0.35 : 1,
              }}
              className="min-w-[6px] transition-opacity hover:opacity-80"
            >
              <span className="sr-only">
                {p.name}, {p.count} students{selected ? ', selected' : ''}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {programs.map((p, i) => (
          <li key={p.programId}>
            <button
              type="button"
              onClick={() => toggle(p.programId)}
              className={`inline-flex items-center gap-2 rounded-sm px-1 -mx-1 hover:text-ink ${
                selectedProgramId === p.programId ? 'bg-highlight-soft font-semibold text-ink' : 'text-ink-muted'
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{
                  backgroundColor:
                    selectedProgramId === p.programId ? 'rgb(var(--highlight))' : `rgb(var(--brand) / ${SHADES[i] ?? 0.2})`,
                }}
                aria-hidden="true"
              />
              {p.name}
              <span className="tabular text-ink">{p.count}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="tabular font-semibold text-ink">{value}</dd>
    </div>
  );
}
