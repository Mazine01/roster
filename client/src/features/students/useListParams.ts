import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SORT_FIELDS, STUDENT_STATUSES, type StudentQuery, type StudentStatus } from '@roster/shared';

type SortField = (typeof SORT_FIELDS)[number];

/**
 * All list state lives in the URL, so a refresh, the back button or a shared
 * link shows exactly the same filtered page and open record.
 */
export function useListParams() {
  const [params, setParams] = useSearchParams();

  const query = useMemo<StudentQuery>(() => {
    const num = (k: string) => {
      const v = Number(params.get(k));
      return Number.isInteger(v) && v > 0 ? v : undefined;
    };
    const status = params.get('status') as StudentStatus | null;
    const sort = params.get('sort') as SortField | null;
    return {
      search: params.get('search') || undefined,
      programId: num('programId'),
      year: num('year'),
      status: status && STUDENT_STATUSES.includes(status) ? status : undefined,
      sort: sort && SORT_FIELDS.includes(sort) ? sort : 'name',
      order: params.get('order') === 'desc' ? 'desc' : 'asc',
      page: num('page') ?? 1,
      limit: 20,
    };
  }, [params]);

  const selectedId = Number(params.get('student')) || null;
  const mode: 'view' | 'edit' | 'new' | null = params.get('new')
    ? 'new'
    : selectedId
      ? params.get('edit')
        ? 'edit'
        : 'view'
      : null;

  const update = useCallback(
    (patch: Record<string, string | number | undefined | null>, { resetPage = true } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === null || v === '') next.delete(k);
            else next.set(k, String(v));
          }
          if (resetPage && !('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const hasFilters = Boolean(query.search || query.programId || query.year || query.status);

  return { query, selectedId, mode, update, hasFilters };
}
