import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react';
import type { Student, StudentQuery } from '@roster/shared';
import { StatusChip } from '../../components/ui/StatusChip';

type SortField = NonNullable<StudentQuery['sort']>;

interface Props {
  students: Student[];
  selectedId: number | null;
  sort: SortField;
  order: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  onOpen: (id: number) => void;
}

const COLUMNS: { key: string; label: string; sort?: SortField; className?: string }[] = [
  { key: 'name', label: 'Student', sort: 'name' },
  { key: 'no', label: 'Student no.', sort: 'studentNo' },
  { key: 'program', label: 'Program' },
  { key: 'year', label: 'Year', sort: 'year', className: 'text-right' },
  { key: 'gpa', label: 'GPA', sort: 'gpa', className: 'text-right' },
  { key: 'status', label: 'Status' },
];

export function StudentTable({ students, selectedId, sort, order, onSort, onOpen }: Props) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-panel border border-rule bg-surface md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Students. Select a row to open the record.</caption>
          <thead className="sticky top-0 z-10 bg-sunken">
            <tr className="border-b border-rule">
              {COLUMNS.map((c) => {
                const active = c.sort && c.sort === sort;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`h-10 px-4 text-left font-semibold text-ink-muted first:pl-5 ${c.className ?? ''}`}
                  >
                    {c.sort ? (
                      <button
                        type="button"
                        onClick={() => onSort(c.sort!)}
                        className={`inline-flex items-center gap-1 rounded-sm hover:text-ink ${active ? 'text-ink' : ''}`}
                      >
                        {c.label}
                        {active &&
                          (order === 'asc' ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />)}
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
              <th scope="col" className="w-10">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const selected = s.id === selectedId;
              return (
                <tr
                  key={s.id}
                  onClick={() => onOpen(s.id)}
                  className={`group cursor-pointer border-b border-rule last:border-b-0 ${
                    selected ? 'bg-highlight-soft' : 'hover:bg-sunken/70'
                  }`}
                >
                  <td className="relative py-2.5 pl-5 pr-4">
                    {selected && <span className="absolute inset-y-0 left-0 w-1 bg-highlight" aria-hidden="true" />}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(s.id);
                      }}
                      aria-current={selected ? 'true' : undefined}
                      className="text-left"
                    >
                      <span className="block font-semibold text-ink">
                        {s.lastName}, {s.firstName}
                      </span>
                      <span className="block max-w-[260px] truncate text-xs text-ink-muted">{s.email}</span>
                    </button>
                  </td>
                  <td className="tabular px-4 py-2.5 text-ink">{s.studentNo}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-ink">{s.program.name}</span>
                  </td>
                  <td className="tabular px-4 py-2.5 text-right">{s.year}</td>
                  <td className="tabular px-4 py-2.5 text-right font-medium">{s.gpa?.toFixed(2) ?? '–'}</td>
                  <td className="px-4 py-2.5">
                    <StatusChip status={s.status} />
                  </td>
                  <td className="pr-3 text-ink-muted">
                    <ChevronRight size={16} className="opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-rule overflow-hidden rounded-panel border border-rule bg-surface md:hidden">
        {students.map((s) => {
          const selected = s.id === selectedId;
          return (
            <li key={s.id} className={selected ? 'bg-highlight-soft' : ''}>
              <button type="button" onClick={() => onOpen(s.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">
                      {s.firstName} {s.lastName}
                    </span>
                    <StatusChip status={s.status} />
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-muted">
                    <span className="tabular">{s.studentNo}</span>, {s.program.code} year {s.year}
                    {s.gpa !== null && (
                      <>
                        , GPA <span className="tabular">{s.gpa.toFixed(2)}</span>
                      </>
                    )}
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-ink-muted" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-panel border border-rule bg-surface" aria-hidden="true">
      <div className="h-10 border-b border-rule bg-sunken" />
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-rule px-5 py-3.5 last:border-b-0">
          <div className="h-3.5 w-48 animate-pulse rounded bg-sunken" />
          <div className="h-3.5 w-20 animate-pulse rounded bg-sunken" />
          <div className="hidden h-3.5 w-36 animate-pulse rounded bg-sunken md:block" />
          <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-sunken" />
        </div>
      ))}
    </div>
  );
}
