import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Mail, Pencil, Phone, Trash2, X } from 'lucide-react';
import type { Program, Student } from '@roster/shared';
import { Button, Spinner } from '../../components/ui/Button';
import { ConfirmDialog, Drawer } from '../../components/ui/Dialogs';
import { StatusChip } from '../../components/ui/StatusChip';
import { useToast } from '../../components/ui/Toast';
import { ApiError } from '../../lib/api';
import { STUDENT_FORM_ID, StudentForm } from './StudentForm';
import { useCreateStudent, useDeleteStudent, useRestoreStudent, useStudent, useUpdateStudent } from './api';

interface Props {
  mode: 'view' | 'edit' | 'new' | null;
  studentId: number | null;
  programs: Program[];
  onClose: () => void;
  onEdit: () => void;
  onView: (id: number) => void;
}

const fullName = (s: Pick<Student, 'firstName' | 'lastName'>) => `${s.firstName} ${s.lastName}`;

export function StudentDrawer({ mode, studentId, programs, onClose, onEdit, onView }: Props) {
  const toast = useToast();
  const { data: student, isLoading, error } = useStudent(mode === 'new' ? null : studentId);
  const create = useCreateStudent();
  const update = useUpdateStudent();
  const remove = useDeleteStudent();
  const restore = useRestoreStudent();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const open = mode !== null;
  const saving = create.isPending || update.isPending;

  const handleDelete = () => {
    if (!student) return;
    remove.mutate(student.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        onClose();
        toast(`${fullName(student)} removed from the roster.`, {
          duration: 6000,
          action: {
            label: 'Undo',
            onClick: () =>
              restore.mutate(student.id, {
                onSuccess: () => toast(`${fullName(student)} restored.`),
                onError: (e) => toast(e.message, { tone: 'error' }),
              }),
          },
        });
      },
      onError: (e) => toast(e.message, { tone: 'error' }),
    });
  };

  const notifyFailure = (e: unknown) => {
    if (!(e instanceof ApiError && e.fields)) toast((e as Error).message, { tone: 'error' });
  };

  if (mode === 'new') {
    return (
      <Drawer
        open={open}
        onOpenChange={(o) => !o && onClose()}
        title="Add student"
        description="Every field except phone and GPA is required."
        footer={
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" form={STUDENT_FORM_ID} variant="primary" loading={saving}>
              Add student
            </Button>
          </>
        }
      >
        <StudentForm
          programs={programs}
          onSubmit={(values) =>
            create
              .mutateAsync(values)
              .then((s) => {
                toast(`${fullName(s)} added.`);
                onView(s.id);
              })
              .catch((e) => {
                notifyFailure(e);
                throw e;
              })
          }
        />
      </Drawer>
    );
  }

  if (mode === 'edit' && student) {
    return (
      <Drawer
        open={open}
        onOpenChange={(o) => !o && onClose()}
        title={`Edit ${fullName(student)}`}
        description={`Student no. ${student.studentNo}`}
        footer={
          <>
            <Button onClick={() => onView(student.id)}>Cancel</Button>
            <Button type="submit" form={STUDENT_FORM_ID} variant="primary" loading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        <StudentForm
          key={student.id}
          student={student}
          programs={programs}
          onSubmit={(values) =>
            update
              .mutateAsync({ id: student.id, input: values })
              .then((s) => {
                toast('Changes saved.');
                onView(s.id);
              })
              .catch((e) => {
                notifyFailure(e);
                throw e;
              })
          }
        />
      </Drawer>
    );
  }

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(o) => !o && onClose()}
        title={student ? fullName(student) : 'Student'}
        header={student ? <IdCardHeader student={student} /> : <LoadingHeader />}
        footer={
          student && (
            <div className="flex w-full items-center justify-between">
              <Button variant="ghost" onClick={() => setConfirmOpen(true)} className="-ml-2 !text-danger hover:!bg-danger-soft">
                <Trash2 size={16} aria-hidden="true" />
                Delete
              </Button>
              <Button variant="primary" onClick={onEdit}>
                <Pencil size={16} aria-hidden="true" />
                Edit record
              </Button>
            </div>
          )
        }
      >
        {isLoading && (
          <div className="flex justify-center py-12 text-ink-muted">
            <Spinner className="h-6 w-6" />
          </div>
        )}
        {error && (
          <p className="rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {error instanceof ApiError && error.status === 404
              ? 'This student is no longer on the roster.'
              : error.message}
          </p>
        )}
        {student && <IdCardBody student={student} />}
      </Drawer>

      {student && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Delete ${fullName(student)}?`}
          body={<>Their record leaves the roster. You can undo this for a few seconds afterwards.</>}
          confirmLabel="Delete student"
          onConfirm={handleDelete}
          loading={remove.isPending}
        />
      )}
    </>
  );
}

function IdCardHeader({ student }: { student: Student }) {
  const initials = `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase();
  return (
    <div className="relative bg-[rgb(31_61_54)] px-6 pb-6 pt-5 text-[rgb(251_252_250)]">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/70">{student.program.name}</span>
        <Dialog.Close asChild>
          <button type="button" aria-label="Close" className="-mr-2 rounded-control p-2 text-white/80 hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </Dialog.Close>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[rgb(242_214_59)] text-xl font-bold text-[rgb(31_61_54)]"
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-bold leading-tight">
            {student.firstName} {student.lastName}
          </p>
          <p className="tabular mt-1 text-2xl font-semibold tracking-wide text-white/90">{student.studentNo}</p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1.5 bg-[rgb(242_214_59)]" aria-hidden="true" />
    </div>
  );
}

function LoadingHeader() {
  return <div className="h-[148px] animate-pulse bg-[rgb(31_61_54)]" aria-hidden="true" />;
}

function age(dob: string) {
  const d = new Date(`${dob}T00:00:00Z`);
  const now = new Date();
  let a = now.getUTCFullYear() - d.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < d.getUTCMonth() || (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate());
  if (beforeBirthday) a -= 1;
  return a;
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function IdCardBody({ student }: { student: Student }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <StatusChip status={student.status} />
        <span className="text-sm text-ink-muted">
          Updated {new Date(student.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-panel border border-rule bg-rule">
        <Stat label="Year" value={String(student.year)} />
        <Stat label="GPA" value={student.gpa?.toFixed(2) ?? '–'} />
        <Stat label="Age" value={String(age(student.dateOfBirth))} />
      </dl>

      <dl className="divide-y divide-rule border-y border-rule text-sm">
        <Row label="Program">
          {student.program.name} <span className="text-ink-muted">({student.program.code})</span>
        </Row>
        <Row label="Enrolled">{formatDate(student.enrolledAt)}</Row>
        <Row label="Date of birth">{formatDate(student.dateOfBirth)}</Row>
        <Row label="Email">
          <a href={`mailto:${student.email}`} className="inline-flex items-center gap-1.5 break-all text-brand underline-offset-2 hover:underline">
            <Mail size={14} aria-hidden="true" className="shrink-0" />
            {student.email}
          </a>
        </Row>
        <Row label="Phone">
          {student.phone ? (
            <a href={`tel:${student.phone.replace(/[^\d+]/g, '')}`} className="tabular inline-flex items-center gap-1.5 text-brand underline-offset-2 hover:underline">
              <Phone size={14} aria-hidden="true" />
              {student.phone}
            </a>
          ) : (
            <span className="text-ink-muted">Not on file</span>
          )}
        </Row>
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-xl font-semibold">{value}</dd>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}
