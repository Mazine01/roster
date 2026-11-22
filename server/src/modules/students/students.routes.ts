import { Router } from 'express';
import { z } from 'zod';
import { studentInputSchema, studentQuerySchema, studentUpdateSchema } from '@roster/shared';
import { validate } from '../../middleware/validate.js';
import * as service from './students.service.js';

export const studentsRouter = Router();

const idParams = z.object({ id: z.coerce.number().int().positive('Invalid student id') });

type Query = z.output<typeof studentQuerySchema>;

studentsRouter.get('/', validate(studentQuerySchema, 'query'), async (_req, res) => {
  res.json(await service.listStudents(res.locals.query as Query));
});

// Declared before "/:id" so "export.csv" is not read as an id.
studentsRouter.get('/export.csv', validate(studentQuerySchema, 'query'), async (_req, res) => {
  const rows = await service.exportStudents(res.locals.query as Query);
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="roster-students-${date}.csv"`);
  res.send('﻿' + service.toCsv(rows)); // BOM so Excel reads UTF-8 names correctly
});

studentsRouter.get('/:id', validate(idParams, 'params'), async (_req, res) => {
  res.json({ data: await service.getStudent(res.locals.params.id) });
});

studentsRouter.post('/', validate(studentInputSchema), async (_req, res) => {
  res.status(201).json({ data: await service.createStudent(res.locals.body) });
});

studentsRouter.patch('/:id', validate(idParams, 'params'), validate(studentUpdateSchema), async (_req, res) => {
  res.json({ data: await service.updateStudent(res.locals.params.id, res.locals.body) });
});

studentsRouter.delete('/:id', validate(idParams, 'params'), async (_req, res) => {
  await service.deleteStudent(res.locals.params.id);
  res.status(204).end();
});

studentsRouter.post('/:id/restore', validate(idParams, 'params'), async (_req, res) => {
  res.json({ data: await service.restoreStudent(res.locals.params.id) });
});
