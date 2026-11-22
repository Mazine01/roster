import { faker } from '@faker-js/faker';
import { hash } from '@node-rs/argon2';
import type { StudentStatus } from '@roster/shared';
import { db, pool } from './index.js';
import { programs, students, users } from './schema.js';

const PROGRAMS = [
  { name: 'Computer Science', code: 'CS' },
  { name: 'Software Engineering', code: 'SE' },
  { name: 'Information Security', code: 'IS' },
  { name: 'Data Science', code: 'DS' },
  { name: 'Electrical Engineering', code: 'EE' },
  { name: 'Business Administration', code: 'BA' },
];

// Weighted so the dashboard looks like a real school: mostly active students.
const STATUS_POOL: StudentStatus[] = [
  ...Array<StudentStatus>(14).fill('ACTIVE'),
  'GRADUATED',
  'GRADUATED',
  'SUSPENDED',
  'WITHDRAWN',
];

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  faker.seed(2026);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@roster.dev';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Roster!2026';

  await db.delete(students);
  await db.delete(programs);
  await db.delete(users);

  await db.insert(users).values({ email: adminEmail, name: 'Registrar Admin', passwordHash: await hash(adminPassword) });

  const created = await db.insert(programs).values(PROGRAMS).returning();

  const usedNumbers = new Set<string>();
  const rows = Array.from({ length: 60 }, () => {
    const program = faker.helpers.arrayElement(created);
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const year = faker.number.int({ min: 1, max: 4 });
    const intake = 2025 - (year - 1); // year 1 enrolled in 2025, year 4 in 2022

    let studentNo: string;
    do {
      studentNo = `${program.code}${String(intake).slice(2)}${faker.string.numeric(4)}`;
    } while (usedNumbers.has(studentNo));
    usedNumbers.add(studentNo);

    const local = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, '');

    return {
      studentNo,
      firstName,
      lastName,
      email: `${local}.${studentNo.slice(-4)}@student.roster.dev`,
      phone: faker.helpers.maybe(() => faker.phone.number({ style: 'international' }), { probability: 0.8 }) ?? null,
      dateOfBirth: isoDate(faker.date.birthdate({ min: 18 + year - 1, max: 21 + year, mode: 'age' })),
      programId: program.id,
      year,
      gpa: faker.number.float({ min: 2.1, max: 4, fractionDigits: 2 }).toFixed(2),
      status: faker.helpers.arrayElement(STATUS_POOL),
      enrolledAt: `${intake}-09-0${faker.number.int({ min: 1, max: 9 })}`,
    };
  });

  await db.insert(students).values(rows);

  console.log(`Seeded 1 admin (${adminEmail}), ${created.length} programs, ${rows.length} students.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
