import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hash } from '@node-rs/argon2';
import { createApp } from '../src/app.js';
import { db, pool } from '../src/db/index.js';
import { programs, students, users } from '../src/db/schema.js';

const app = createApp();
const ADMIN = { email: 'admin@test.dev', password: 'Correct-Horse-9' };

let programId: number;
let cookie: string[];

const valid = () => ({
  studentNo: 'CS240117',
  firstName: 'Amina',
  lastName: 'Benali',
  email: 'amina.benali@test.dev',
  phone: '+212 600 000 000',
  dateOfBirth: '2003-05-14',
  programId,
  year: 2,
  gpa: 3.67,
  status: 'ACTIVE',
  enrolledAt: '2024-09-02',
});

beforeAll(async () => {
  await db.delete(students);
  await db.delete(programs);
  await db.delete(users);
  await db.insert(users).values({ email: ADMIN.email, name: 'Test Admin', passwordHash: await hash(ADMIN.password) });
  [{ id: programId }] = await db.insert(programs).values({ name: 'Computer Science', code: 'CS' }).returning();

  const res = await request(app).post('/api/auth/login').send(ADMIN);
  cookie = res.get('Set-Cookie') ?? [];
});

beforeEach(async () => {
  await db.delete(students);
});

afterAll(async () => {
  await pool.end();
});

describe('auth', () => {
  it('rejects a wrong password with 401 and the same message as an unknown email', async () => {
    const wrong = await request(app).post('/api/auth/login').send({ ...ADMIN, password: 'nope' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'ghost@test.dev', password: 'nope' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('sets an httpOnly session cookie on login', () => {
    expect(cookie.join(';')).toMatch(/roster_session=.+HttpOnly/i);
  });

  it('blocks student routes without a session', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a forged token', async () => {
    const res = await request(app).get('/api/students').set('Cookie', 'roster_session=eyJhbGciOiJub25lIn0.e30.');
    expect(res.status).toBe(401);
  });
});

describe('students CRUD', () => {
  it('creates a student and returns it with its program', async () => {
    const res = await request(app).post('/api/students').set('Cookie', cookie).send(valid());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      studentNo: 'CS240117',
      email: 'amina.benali@test.dev',
      gpa: 3.67,
      dateOfBirth: '2003-05-14',
      program: { code: 'CS' },
    });
  });

  it('returns field errors for invalid input', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Cookie', cookie)
      .send({ ...valid(), email: 'not-an-email', gpa: 5, studentNo: 'x1' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(['email', 'gpa', 'studentNo']));
  });

  it('returns 409 on the right field for a duplicate email', async () => {
    await request(app).post('/api/students').set('Cookie', cookie).send(valid());
    const res = await request(app)
      .post('/api/students')
      .set('Cookie', cookie)
      .send({ ...valid(), studentNo: 'CS240999' });
    expect(res.status).toBe(409);
    expect(res.body.error.fields).toHaveProperty('email');
  });

  it('rejects an unknown program', async () => {
    const res = await request(app).post('/api/students').set('Cookie', cookie).send({ ...valid(), programId: 99999 });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('programId');
  });

  it('updates only the fields sent', async () => {
    const { body } = await request(app).post('/api/students').set('Cookie', cookie).send(valid());
    const res = await request(app)
      .patch(`/api/students/${body.data.id}`)
      .set('Cookie', cookie)
      .send({ year: 3, status: 'SUSPENDED' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ year: 3, status: 'SUSPENDED', firstName: 'Amina' });
  });

  it('soft-deletes, hides, then restores a student', async () => {
    const { body } = await request(app).post('/api/students').set('Cookie', cookie).send(valid());
    const id = body.data.id;

    expect((await request(app).delete(`/api/students/${id}`).set('Cookie', cookie)).status).toBe(204);
    expect((await request(app).get(`/api/students/${id}`).set('Cookie', cookie)).status).toBe(404);
    expect((await request(app).get('/api/students').set('Cookie', cookie)).body.meta.total).toBe(0);

    const restored = await request(app).post(`/api/students/${id}/restore`).set('Cookie', cookie);
    expect(restored.status).toBe(200);
    expect(restored.body.data.id).toBe(id);
  });

  it('returns 404 for a student that does not exist', async () => {
    expect((await request(app).get('/api/students/123456').set('Cookie', cookie)).status).toBe(404);
    expect((await request(app).patch('/api/students/123456').set('Cookie', cookie).send({ year: 2 })).status).toBe(404);
    expect((await request(app).delete('/api/students/123456').set('Cookie', cookie)).status).toBe(404);
  });
});

describe('list, search and export', () => {
  beforeEach(async () => {
    const make = (n: string, first: string, last: string, year: number, status = 'ACTIVE') =>
      request(app)
        .post('/api/students')
        .set('Cookie', cookie)
        .send({ ...valid(), studentNo: n, firstName: first, lastName: last, email: `${n.toLowerCase()}@test.dev`, year, status });
    await make('CS240001', 'Yassine', 'Alaoui', 1);
    await make('CS240002', 'Lina', 'Zhang', 2);
    await make('CS230003', 'Omar', 'Idrissi', 3, 'GRADUATED');
  });

  it('paginates with meta', async () => {
    const res = await request(app).get('/api/students?limit=2&page=2').set('Cookie', cookie);
    expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 3, pages: 2 });
    expect(res.body.data).toHaveLength(1);
  });

  it('matches every search word across fields', async () => {
    const res = await request(app).get('/api/students?search=lina%20cs24').set('Cookie', cookie);
    expect(res.body.data.map((s: { lastName: string }) => s.lastName)).toEqual(['Zhang']);
  });

  it('filters by status and sorts', async () => {
    const res = await request(app).get('/api/students?status=ACTIVE&sort=year&order=desc').set('Cookie', cookie);
    expect(res.body.data.map((s: { year: number }) => s.year)).toEqual([2, 1]);
  });

  it('exports the filtered list as CSV', async () => {
    const res = await request(app).get('/api/students/export.csv?status=GRADUATED').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    const lines = res.text.trim().split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"Idrissi"');
  });

  it('reports stats for live students only', async () => {
    const res = await request(app).get('/api/stats').set('Cookie', cookie);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.byStatus).toMatchObject({ ACTIVE: 2, GRADUATED: 1 });
  });
});
