import { relations } from 'drizzle-orm';
import { date, index, integer, numeric, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { STUDENT_STATUSES } from '@roster/shared';

export const roleEnum = pgEnum('role', ['ADMIN']);
export const studentStatusEnum = pgEnum('student_status', STUDENT_STATUSES);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('ADMIN'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const programs = pgTable('programs', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
});

export const students = pgTable(
  'students',
  {
    id: serial('id').primaryKey(),
    studentNo: text('student_no').notNull().unique('students_student_no_unique'),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull().unique('students_email_unique'),
    phone: text('phone'),
    dateOfBirth: date('date_of_birth').notNull(),
    programId: integer('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'restrict' }),
    year: integer('year').notNull(),
    gpa: numeric('gpa', { precision: 3, scale: 2 }),
    status: studentStatusEnum('status').notNull().default('ACTIVE'),
    enrolledAt: date('enrolled_at').notNull(),
    photoUrl: text('photo_url'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('students_name_idx').on(t.lastName, t.firstName),
    index('students_program_idx').on(t.programId),
    index('students_status_idx').on(t.status),
    index('students_deleted_idx').on(t.deletedAt),
  ],
);

export const programsRelations = relations(programs, ({ many }) => ({ students: many(students) }));
export const studentsRelations = relations(students, ({ one }) => ({
  program: one(programs, { fields: [students.programId], references: [programs.id] }),
}));

/** Maps a unique constraint name to the form field it belongs to. */
export const UNIQUE_CONSTRAINT_FIELDS: Record<string, { field: string; message: string }> = {
  students_email_unique: { field: 'email', message: 'Another student already uses this email' },
  students_student_no_unique: { field: 'studentNo', message: 'Another student already has this student number' },
};
