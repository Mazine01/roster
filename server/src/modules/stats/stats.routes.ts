import { Router } from 'express';
import { and, avg, count, desc, eq, isNull } from 'drizzle-orm';
import { STUDENT_STATUSES, type Stats, type StudentStatus } from '@roster/shared';
import { db } from '../../db/index.js';
import { programs, students } from '../../db/schema.js';

export const statsRouter = Router();

statsRouter.get('/', async (_req, res) => {
  const live = isNull(students.deletedAt);

  const [byStatusRows, byProgram, [gpa]] = await Promise.all([
    db.select({ status: students.status, n: count() }).from(students).where(live).groupBy(students.status),
    db
      .select({ programId: programs.id, name: programs.name, code: programs.code, count: count(students.id) })
      .from(programs)
      .leftJoin(students, and(eq(students.programId, programs.id), live))
      .groupBy(programs.id)
      .orderBy(desc(count(students.id)), programs.name),
    db
      .select({ value: avg(students.gpa) })
      .from(students)
      .where(and(live, eq(students.status, 'ACTIVE'))),
  ]);

  const byStatus = Object.fromEntries(STUDENT_STATUSES.map((s) => [s, 0])) as Record<StudentStatus, number>;
  for (const r of byStatusRows) byStatus[r.status] = r.n;

  const body: Stats = {
    total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    byStatus,
    byProgram,
    averageGpa: gpa.value === null ? null : Math.round(Number(gpa.value) * 100) / 100,
  };
  res.json({ data: body });
});
