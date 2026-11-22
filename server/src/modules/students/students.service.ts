import { and, asc, count, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { Student as StudentDTO, StudentPayload, studentQuerySchema } from '@roster/shared';
import type { z } from 'zod';
import { db } from '../../db/index.js';
import { programs, students } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';

type ParsedQuery = z.output<typeof studentQuerySchema>;

const columns = {
  student: students,
  program: { id: programs.id, name: programs.name, code: programs.code },
};

type Row = { student: typeof students.$inferSelect; program: { id: number; name: string; code: string } };

/** Database row → API shape (GPA as a number, timestamps as ISO strings). */
export function serialize({ student: s, program }: Row): StudentDTO {
  return {
    id: s.id,
    studentNo: s.studentNo,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    phone: s.phone,
    dateOfBirth: s.dateOfBirth,
    programId: s.programId,
    program,
    year: s.year,
    gpa: s.gpa === null ? null : Number(s.gpa),
    status: s.status,
    enrolledAt: s.enrolledAt,
    photoUrl: s.photoUrl,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

/** Escapes LIKE wildcards so a search for "50%" means the text "50%". */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** WHERE clause shared by the list and the CSV export. */
function buildWhere(q: ParsedQuery): SQL | undefined {
  const parts: (SQL | undefined)[] = [isNull(students.deletedAt)];
  if (q.programId) parts.push(eq(students.programId, q.programId));
  if (q.year) parts.push(eq(students.year, q.year));
  if (q.status) parts.push(eq(students.status, q.status));

  // Every word typed must match one of name, email or student number,
  // so "lina cs24" finds Lina in Computer Science, 2024 intake.
  const words = q.search?.split(/\s+/).filter(Boolean).slice(0, 5) ?? [];
  for (const w of words) {
    const pattern = `%${likeEscape(w)}%`;
    parts.push(
      or(
        ilike(students.firstName, pattern),
        ilike(students.lastName, pattern),
        ilike(students.email, pattern),
        ilike(students.studentNo, pattern),
      ),
    );
  }
  return and(...parts);
}

function buildOrder(q: ParsedQuery): SQL[] {
  const dir = q.order === 'desc' ? desc : asc;
  switch (q.sort) {
    case 'studentNo':
      return [dir(students.studentNo)];
    case 'year':
      return [dir(students.year), asc(students.lastName)];
    case 'gpa':
      // Students without a GPA always sink to the bottom, whichever direction.
      return [sql`${students.gpa} ${sql.raw(q.order)} nulls last`, asc(students.lastName)];
    case 'enrolledAt':
      return [dir(students.enrolledAt), asc(students.lastName)];
    default:
      return [dir(students.lastName), dir(students.firstName), asc(students.id)];
  }
}

const baseSelect = () => db.select(columns).from(students).innerJoin(programs, eq(students.programId, programs.id));

export async function listStudents(q: ParsedQuery) {
  const where = buildWhere(q);
  const [rows, [{ total }]] = await Promise.all([
    baseSelect()
      .where(where)
      .orderBy(...buildOrder(q))
      .limit(q.limit)
      .offset((q.page - 1) * q.limit),
    db.select({ total: count() }).from(students).where(where),
  ]);
  return {
    data: rows.map(serialize),
    meta: { page: q.page, limit: q.limit, total, pages: Math.max(1, Math.ceil(total / q.limit)) },
  };
}

export async function exportStudents(q: ParsedQuery) {
  const rows = await baseSelect()
    .where(buildWhere(q))
    .orderBy(...buildOrder(q))
    .limit(5000);
  return rows.map(serialize);
}

export async function getStudent(id: number) {
  const [row] = await baseSelect().where(and(eq(students.id, id), isNull(students.deletedAt)));
  if (!row) throw AppError.notFound('Student');
  return serialize(row);
}

async function assertProgram(programId: number | undefined) {
  if (programId === undefined) return;
  const [found] = await db.select({ id: programs.id }).from(programs).where(eq(programs.id, programId));
  if (!found) throw AppError.badRequest('Some fields need fixing', { programId: 'Choose a program from the list' });
}

/** Validated payload → column values. Only keys that were sent are included. */
function toColumns(p: Partial<StudentPayload>) {
  const out: Partial<typeof students.$inferInsert> = {};
  if (p.studentNo !== undefined) out.studentNo = p.studentNo;
  if (p.firstName !== undefined) out.firstName = p.firstName;
  if (p.lastName !== undefined) out.lastName = p.lastName;
  if (p.email !== undefined) out.email = p.email;
  if (p.phone !== undefined) out.phone = p.phone || null;
  if (p.dateOfBirth !== undefined) out.dateOfBirth = p.dateOfBirth;
  if (p.programId !== undefined) out.programId = p.programId;
  if (p.year !== undefined) out.year = p.year;
  if (p.gpa !== undefined) out.gpa = p.gpa === null ? null : p.gpa.toFixed(2);
  if (p.status !== undefined) out.status = p.status;
  if (p.enrolledAt !== undefined) out.enrolledAt = p.enrolledAt;
  return out;
}

export async function createStudent(p: StudentPayload) {
  await assertProgram(p.programId);
  const [{ id }] = await db
    .insert(students)
    .values(toColumns(p) as typeof students.$inferInsert)
    .returning({ id: students.id });
  return getStudent(id);
}

export async function updateStudent(id: number, p: Partial<StudentPayload>) {
  await getStudent(id); // 404 if missing or deleted
  await assertProgram(p.programId);
  const values = toColumns(p);
  if (Object.keys(values).length) {
    await db
      .update(students)
      .set(values)
      .where(and(eq(students.id, id), isNull(students.deletedAt)));
  }
  return getStudent(id);
}

/** Soft delete, so the UI can offer "Undo" for a few seconds. */
export async function deleteStudent(id: number) {
  const rows = await db
    .update(students)
    .set({ deletedAt: new Date() })
    .where(and(eq(students.id, id), isNull(students.deletedAt)))
    .returning({ id: students.id });
  if (!rows.length) throw AppError.notFound('Student');
}

export async function restoreStudent(id: number) {
  const rows = await db
    .update(students)
    .set({ deletedAt: null })
    .where(and(eq(students.id, id), isNotNull(students.deletedAt)))
    .returning({ id: students.id });
  if (!rows.length) throw AppError.notFound('Deleted student');
  return getStudent(id);
}

const CSV_COLUMNS: [string, (s: StudentDTO) => string | number | null][] = [
  ['Student number', (s) => s.studentNo],
  ['First name', (s) => s.firstName],
  ['Last name', (s) => s.lastName],
  ['Email', (s) => s.email],
  ['Phone', (s) => s.phone],
  ['Program', (s) => s.program.name],
  ['Year', (s) => s.year],
  ['GPA', (s) => (s.gpa === null ? '' : s.gpa.toFixed(2))],
  ['Status', (s) => s.status],
  ['Date of birth', (s) => s.dateOfBirth],
  ['Enrolled', (s) => s.enrolledAt],
];

/** Quotes every cell and neutralises a leading =, +, - or @ so the file is safe to open in Excel. */
function csvCell(v: string | number | null) {
  let s = v === null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows: StudentDTO[]) {
  const header = CSV_COLUMNS.map(([h]) => csvCell(h)).join(',');
  const body = rows.map((r) => CSV_COLUMNS.map(([, get]) => csvCell(get(r))).join(','));
  return [header, ...body].join('\r\n') + '\r\n';
}
