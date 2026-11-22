import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  STATUS_LABELS,
  STUDENT_STATUSES,
  studentInputSchema,
  type Program,
  type Student,
  type StudentPayload,
} from '@roster/shared';
import { SelectField, TextField } from '../../components/ui/Field';
import { ApiError } from '../../lib/api';

export const STUDENT_FORM_ID = 'student-form';

interface Props {
  student?: Student;
  programs: Program[];
  onSubmit: (values: StudentPayload) => Promise<unknown>;
}

const today = () => new Date().toISOString().slice(0, 10);

/** What the inputs hold: always strings. Zod turns them into the typed payload on submit. */
type FormValues = { [K in keyof StudentPayload]: string };

function defaults(s?: Student): FormValues {
  return s
    ? {
        studentNo: s.studentNo,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phone: s.phone ?? '',
        dateOfBirth: s.dateOfBirth,
        programId: String(s.programId),
        year: String(s.year),
        gpa: s.gpa === null ? '' : s.gpa.toFixed(2),
        status: s.status,
        enrolledAt: s.enrolledAt,
      }
    : {
        studentNo: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        programId: '',
        year: '1',
        gpa: '',
        status: 'ACTIVE',
        enrolledAt: today(),
      };
}

export function StudentForm({ student, programs, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<FormValues, unknown, StudentPayload>({
    resolver: zodResolver(studentInputSchema) as unknown as Resolver<FormValues, unknown, StudentPayload>,
    defaultValues: defaults(student),
  });

  useEffect(() => {
    setFocus(student ? 'firstName' : 'studentNo');
  }, [setFocus, student]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        let first = true;
        for (const [field, message] of Object.entries(e.fields)) {
          setError(field as keyof FormValues, { message }, { shouldFocus: first });
          first = false;
        }
      }
    }
  });

  return (
    <form id={STUDENT_FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-6">
      <fieldset className="grid grid-cols-2 gap-4">
        <legend className="col-span-2 mb-3 text-sm font-semibold text-ink-muted">Identity</legend>
        <TextField label="First name" autoComplete="off" error={errors.firstName?.message} {...register('firstName')} />
        <TextField label="Last name" autoComplete="off" error={errors.lastName?.message} {...register('lastName')} />
        <TextField
          label="Student number"
          hint="Program code, intake year, 4 digits"
          placeholder="CS250123"
          className="tabular uppercase"
          error={errors.studentNo?.message}
          {...register('studentNo', { setValueAs: (v: string) => v.toUpperCase() })}
        />
        <TextField label="Date of birth" type="date" error={errors.dateOfBirth?.message} {...register('dateOfBirth')} />
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-4">
        <legend className="col-span-2 mb-3 text-sm font-semibold text-ink-muted">Contact</legend>
        <TextField
          label="Email"
          type="email"
          autoComplete="off"
          wrapperClassName="col-span-2"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Phone (optional)"
          type="tel"
          autoComplete="off"
          wrapperClassName="col-span-2"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-4">
        <legend className="col-span-2 mb-3 text-sm font-semibold text-ink-muted">Enrollment</legend>
        <SelectField label="Program" wrapperClassName="col-span-2" error={errors.programId?.message} {...register('programId')}>
          <option value="" disabled>
            Choose a program
          </option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Year" error={errors.year?.message} {...register('year')}>
          {[1, 2, 3, 4, 5].map((y) => (
            <option key={y} value={y}>
              Year {y}
            </option>
          ))}
        </SelectField>
        <SelectField label="Status" error={errors.status?.message} {...register('status')}>
          {STUDENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="GPA (optional)"
          inputMode="decimal"
          placeholder="3.50"
          className="tabular"
          error={errors.gpa?.message}
          {...register('gpa')}
        />
        <TextField label="Enrolled on" type="date" error={errors.enrolledAt?.message} {...register('enrolledAt')} />
      </fieldset>
    </form>
  );
}
