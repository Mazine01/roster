import { z } from 'zod';

/** Statuses a student record can be in. Order is the order shown in filters. */
export const STUDENT_STATUSES = ['ACTIVE', 'GRADUATED', 'SUSPENDED', 'WITHDRAWN'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const STATUS_LABELS: Record<StudentStatus, string> = {
  ACTIVE: 'Active',
  GRADUATED: 'Graduated',
  SUSPENDED: 'Suspended',
  WITHDRAWN: 'Withdrawn',
};

const trimmed = (label: string, max: number) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

/** Used by the add/edit form on the client and by POST/PATCH on the server. */
export const studentInputSchema = z.object({
  studentNo: z
    .string({ required_error: 'Student number is required' })
    .trim()
    .regex(/^[A-Z]{2}\d{6}$/, 'Use 2 capital letters then 6 digits, like CS240117'),
  firstName: trimmed('First name', 60),
  lastName: trimmed('Last name', 60),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone must be 30 characters or fewer')
    .regex(/^[+\d\s()-]*$/, 'Phone can only contain digits, spaces, +, ( ) and -')
    .optional()
    .or(z.literal('')),
  dateOfBirth: z
    .string({ required_error: 'Date of birth is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
    .refine((v) => {
      const d = new Date(`${v}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) return false;
      const age = (Date.now() - d.getTime()) / (365.25 * 864e5);
      return age >= 15 && age <= 90;
    }, 'Student must be between 15 and 90 years old'),
  programId: z.coerce
    .number({ invalid_type_error: 'Choose a program' })
    .int()
    .positive('Choose a program'),
  year: z.coerce.number().int().min(1, 'Year is 1 to 5').max(5, 'Year is 1 to 5'),
  gpa: z
    .union([z.literal(''), z.null(), z.coerce.number().min(0, 'GPA is 0.00 to 4.00').max(4, 'GPA is 0.00 to 4.00')])
    .optional()
    .transform((v) => (v === '' || v === null || v === undefined ? null : Math.round(v * 100) / 100)),
  status: z.enum(STUDENT_STATUSES),
  enrolledAt: z
    .string({ required_error: 'Enrollment date is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD'),
});

export type StudentInput = z.input<typeof studentInputSchema>;
export type StudentPayload = z.output<typeof studentInputSchema>;

export const studentUpdateSchema = studentInputSchema.partial();

export const SORT_FIELDS = ['name', 'studentNo', 'year', 'gpa', 'enrolledAt'] as const;

export const studentQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  programId: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().min(1).max(5).optional(),
  status: z.enum(STUDENT_STATUSES).optional(),
  sort: z.enum(SORT_FIELDS).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type StudentQuery = z.input<typeof studentQuerySchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Shape returned by the API for one student. Dates are ISO strings (YYYY-MM-DD). */
export interface Student {
  id: number;
  studentNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string;
  programId: number;
  program: { id: number; name: string; code: string };
  year: number;
  gpa: number | null;
  status: StudentStatus;
  enrolledAt: string;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Program {
  id: number;
  name: string;
  code: string;
  studentCount?: number;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; pages: number };
}

export interface Stats {
  total: number;
  byStatus: Record<StudentStatus, number>;
  byProgram: { programId: number; name: string; code: string; count: number }[];
  averageGpa: number | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}
