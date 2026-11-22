import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@roster/shared';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { ApiError } from '../../lib/api';
import { Wordmark } from '../../app/Wordmark';
import { SiteFooter } from '../../components/SiteFooter';
import { useLogin, useMe } from './auth';

export function LoginPage() {
  const { data: me } = useMe();
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (me) return <Navigate to={from} replace />;

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, { onSuccess: () => navigate(from, { replace: true }) }),
  );

  const serverError = login.error instanceof ApiError ? login.error.message : login.error ? 'Sign-in failed. Try again.' : null;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-brand lg:block" aria-hidden="true">
        <div className="absolute inset-0 flex flex-col justify-center gap-0 px-16">
          {LEDGER.map((row, i) => (
            <div
              key={row.no}
              className={`grid grid-cols-[110px_1fr_60px] items-center border-b border-white/10 py-3.5 text-[15px] tabular ${
                i === 4 ? 'relative text-[rgb(43_47_46)]' : 'text-white/45'
              }`}
            >
              {i === 4 && <span className="absolute -inset-x-3 inset-y-1 -z-0 rounded-sm bg-[rgb(242_214_59)]" />}
              <span className="relative">{row.no}</span>
              <span className="relative">{row.name}</span>
              <span className="relative text-right">{row.gpa}</span>
            </div>
          ))}
        </div>
        <p className="absolute bottom-10 left-16 max-w-sm text-lg text-white/85">
          Every student on record, findable in a few keystrokes.
        </p>
      </aside>

      <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Wordmark className="text-brand" />
          <h1 className="mt-10 text-2xl font-bold tracking-tight">Sign in to the registrar</h1>
          <p className="mt-2 text-ink-muted">Use your staff account to manage student records.</p>

          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
            {serverError && (
              <div role="alert" className="rounded-control border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                {serverError}
              </div>
            )}
            <TextField label="Email" type="email" autoComplete="username" autoFocus error={errors.email?.message} {...register('email')} />
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" variant="primary" loading={login.isPending} className="mt-1 h-11">
              Sign in
            </Button>
          </form>

          <p className="mt-8 rounded-control bg-sunken px-3 py-2.5 text-sm text-ink-muted">
            Demo account: <span className="font-medium text-ink">admin@roster.dev</span> /{' '}
            <span className="font-medium text-ink">Roster!2026</span>
          </p>
          <SiteFooter compact className="mt-10" />
        </div>
      </main>
    </div>
  );
}

const LEDGER = [
  { no: 'CS250412', name: 'Mei Lin Zhou', gpa: '3.84' },
  { no: 'SE240087', name: 'Youssef Amrani', gpa: '3.12' },
  { no: 'IS230551', name: 'Clara Nguyen', gpa: '3.67' },
  { no: 'DS250203', name: 'Daniel Osei', gpa: '2.95' },
  { no: 'CS240117', name: 'Amina Benali', gpa: '3.91' },
  { no: 'EE220934', name: 'Tomás Herrera', gpa: '3.40' },
  { no: 'BA250610', name: 'Linh Tran', gpa: '3.58' },
  { no: 'IS240322', name: 'Omar Idrissi', gpa: '3.06' },
  { no: 'SE230745', name: 'Sara Kowalski', gpa: '3.73' },
];
