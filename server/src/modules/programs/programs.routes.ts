import { Router } from 'express';
import { and, asc, count, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { programs, students } from '../../db/schema.js';

export const programsRouter = Router();

programsRouter.get('/', async (_req, res) => {
  const rows = await db
    .select({ id: programs.id, name: programs.name, code: programs.code, studentCount: count(students.id) })
    .from(programs)
    .leftJoin(students, and(eq(students.programId, programs.id), isNull(students.deletedAt)))
    .groupBy(programs.id)
    .orderBy(asc(programs.name));
  res.json({ data: rows });
});
