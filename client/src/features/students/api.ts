import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated, Program, Stats, Student, StudentPayload, StudentQuery } from '@roster/shared';
import { api } from '../../lib/api';

export const keys = {
  all: ['students'] as const,
  list: (q: StudentQuery) => ['students', 'list', q] as const,
  one: (id: number) => ['students', 'one', id] as const,
  programs: ['programs'] as const,
  stats: ['stats'] as const,
};

export function useStudents(query: StudentQuery) {
  return useQuery({
    queryKey: keys.list(query),
    queryFn: () => api<Paginated<Student>>('/api/students', { query: query as Record<string, unknown> }),
    placeholderData: keepPreviousData, // keep the table on screen while the next page loads
  });
}

export function useStudent(id: number | null) {
  return useQuery({
    queryKey: keys.one(id ?? 0),
    queryFn: async () => (await api<{ data: Student }>(`/api/students/${id}`)).data,
    enabled: id !== null,
  });
}

export function usePrograms() {
  return useQuery({
    queryKey: keys.programs,
    queryFn: async () => (await api<{ data: Program[] }>('/api/programs')).data,
    staleTime: 10 * 60 * 1000,
  });
}

export function useStats() {
  return useQuery({
    queryKey: keys.stats,
    queryFn: async () => (await api<{ data: Stats }>('/api/stats')).data,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['students', 'list'] }),
      qc.invalidateQueries({ queryKey: keys.stats }),
      qc.invalidateQueries({ queryKey: keys.programs }),
    ]);
}

export function useCreateStudent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: StudentPayload) =>
      (await api<{ data: Student }>('/api/students', { method: 'POST', body: input })).data,
    onSuccess: invalidate,
  });
}

export function useUpdateStudent() {
  const invalidate = useInvalidate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<StudentPayload> }) =>
      (await api<{ data: Student }>(`/api/students/${id}`, { method: 'PATCH', body: input })).data,
    onSuccess: (student) => {
      qc.setQueryData(keys.one(student.id), student);
      return invalidate();
    },
  });
}

export function useDeleteStudent() {
  const invalidate = useInvalidate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/students/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      qc.setQueryData(keys.one(id), undefined);
      return invalidate();
    },
  });
}

export function useRestoreStudent() {
  const invalidate = useInvalidate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api<{ data: Student }>(`/api/students/${id}/restore`, { method: 'POST' })).data,
    onSuccess: (student) => {
      qc.setQueryData(keys.one(student.id), student);
      return invalidate();
    },
  });
}
