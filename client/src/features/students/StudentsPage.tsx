import { useEffect, useState } from 'react';
import { Download, Plus, Search, X } from 'lucide-react';
import { STATUS_LABELS, STUDENT_STATUSES, type StudentStatus } from '@roster/shared';
import { Button } from '../../components/ui/Button';
import { FilterSelect } from '../../components/ui/Field';
import { apiUrl } from '../../lib/api';
import { EnrollmentStrip } from './EnrollmentStrip';
import { StudentDrawer } from './StudentDrawer';
import { StudentTable, TableSkeleton } from './StudentTable';
import { usePrograms, useStats, useStudents } from './api';
import { useListParams } from './useListParams';

export function StudentsPage() {
  const { query, selectedId, mode, update, hasFilters } = useListParams();
  const students = useStudents(query);
  const programs = usePrograms();
  const stats = useStats();

  const [searchText, setSearchText] = useState(query.search ?? '');
  useEffect(() => setSearchText(query.search ?? ''), [query.search]);
  useEffect(() => {
    if (searchText === (query.search ?? '')) return;
    const t = setTimeout(() => update({ search: searchText.trim() || undefined }), 250);
    return () => clearTimeout(t);
  }, [searchText, query.search, update]);

  const meta = students.data?.meta;
  const rows = students.data?.data ?? [];
  const from = meta && meta.total ? (meta.page - 1) * meta.limit + 1 : 0;
  const to = meta ? Math.min(meta.page * meta.limit, meta.total) : 0;

  const clearFilters = () => {
    setSearchText('');
    update({ search: undefined, programId: undefined, year: undefined, status: undefined });
  };

  const exportHref = apiUrl('/api/students/export.csv', {
    search: query.search,
    programId: query.programId,
    year: query.year,
    status: query.status,
    sort: query.sort,
    order: query.order,
  });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[32px] sm:leading-[38px]">Students</h1>
          <p className="mt-1 text-ink-muted">
            {stats.data ? (
              <>
                <span className="tabular font-medium text-ink">{stats.data.total}</span> students on record,{' '}
                <span className="tabular font-medium text-ink">{stats.data.byStatus.ACTIVE}</span> currently active.
              </>
            ) : (
              'Loading the roster…'
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={exportHref}
            download
            className="inline-flex h-10 items-center gap-2 rounded-control border border-rule-strong bg-surface px-4 text-sm font-semibold text-ink hover:bg-sunken"
          >
            <Download size={16} aria-hidden="true" />
            Export CSV
          </a>
          <Button variant="primary" onClick={() => update({ new: 1, student: undefined, edit: undefined }, { resetPage: false })}>
            <Plus size={16} aria-hidden="true" />
            Add student
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <EnrollmentStrip
          stats={stats.data}
          selectedProgramId={query.programId}
          onSelectProgram={(id) => update({ programId: id })}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <div className="relative col-span-2 sm:w-80">
          <label htmlFor="student-search" className="sr-only">
            Search students
          </label>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            id="student-search"
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Name, email or student number"
            className="h-10 w-full rounded-control border border-rule-strong bg-surface pl-9 pr-3 text-base placeholder:text-ink-muted/70 hover:border-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 sm:text-sm"
          />
        </div>
        <FilterSelect
          label="Program"
          className="col-span-2 sm:w-52"
          value={query.programId ?? ''}
          onChange={(e) => update({ programId: e.target.value })}
        >
          <option value="">All programs</option>
          {programs.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Year" className="sm:w-32" value={query.year ?? ''} onChange={(e) => update({ year: e.target.value })}>
          <option value="">All years</option>
          {[1, 2, 3, 4, 5].map((y) => (
            <option key={y} value={y}>
              Year {y}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Status"
          className="sm:w-40"
          value={query.status ?? ''}
          onChange={(e) => update({ status: e.target.value as StudentStatus })}
        >
          <option value="">Any status</option>
          {STUDENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </FilterSelect>
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="col-span-2 justify-self-start">
            <X size={16} aria-hidden="true" />
            Clear filters
          </Button>
        )}
      </div>

      <div className="mt-4" aria-busy={students.isFetching}>
        {students.isLoading ? (
          <TableSkeleton />
        ) : students.error ? (
          <div className="rounded-panel border border-danger/30 bg-danger-soft px-5 py-6 text-danger">
            <p className="font-semibold">The roster didn’t load.</p>
            <p className="mt-1 text-sm">{students.error.message}</p>
            <Button className="mt-4" onClick={() => students.refetch()}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            filtered={hasFilters}
            onClear={clearFilters}
            onAdd={() => update({ new: 1 }, { resetPage: false })}
          />
        ) : (
          <div className={students.isPlaceholderData ? 'opacity-60 transition-opacity' : ''}>
            <StudentTable
              students={rows}
              selectedId={selectedId}
              sort={query.sort ?? 'name'}
              order={query.order ?? 'asc'}
              onSort={(field) =>
                update({ sort: field, order: query.sort === field && query.order === 'asc' ? 'desc' : 'asc' })
              }
              onOpen={(id) => update({ student: id, edit: undefined, new: undefined }, { resetPage: false })}
            />
          </div>
        )}
      </div>

      {meta && meta.total > 0 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-4 text-sm">
          <p className="text-ink-muted">
            Showing <span className="tabular font-medium text-ink">{from}</span> to{' '}
            <span className="tabular font-medium text-ink">{to}</span> of{' '}
            <span className="tabular font-medium text-ink">{meta.total}</span>
          </p>
          <div className="flex gap-2">
            <Button size="sm" disabled={meta.page <= 1} onClick={() => update({ page: meta.page - 1 })}>
              Previous
            </Button>
            <Button size="sm" disabled={meta.page >= meta.pages} onClick={() => update({ page: meta.page + 1 })}>
              Next
            </Button>
          </div>
        </nav>
      )}

      <StudentDrawer
        mode={mode}
        studentId={selectedId}
        programs={programs.data ?? []}
        onClose={() => update({ student: undefined, edit: undefined, new: undefined }, { resetPage: false })}
        onEdit={() => update({ edit: 1 }, { resetPage: false })}
        onView={(id) => update({ student: id, edit: undefined, new: undefined }, { resetPage: false })}
      />
    </>
  );
}

function EmptyState({ filtered, onClear, onAdd }: { filtered: boolean; onClear: () => void; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-panel border border-dashed border-rule-strong bg-surface px-6 py-16 text-center">
      <svg width="56" height="44" viewBox="0 0 56 44" aria-hidden="true" className="text-rule-strong">
        <rect x="1" y="1" width="54" height="42" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M10 14h36M10 22h36M10 30h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {filtered ? (
        <>
          <p className="mt-4 font-semibold">No students match these filters.</p>
          <p className="mt-1 text-sm text-ink-muted">Try a shorter search, or clear the filters to see everyone.</p>
          <Button className="mt-5" onClick={onClear}>
            Clear filters
          </Button>
        </>
      ) : (
        <>
          <p className="mt-4 font-semibold">No students on the roster yet.</p>
          <p className="mt-1 text-sm text-ink-muted">Add the first record to get started.</p>
          <Button variant="primary" className="mt-5" onClick={onAdd}>
            <Plus size={16} aria-hidden="true" />
            Add student
          </Button>
        </>
      )}
    </div>
  );
}
