import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Spinner } from '../components/ui/Button';
import { LoginPage } from '../features/auth/LoginPage';
import { useMe } from '../features/auth/auth';
import { StudentsPage } from '../features/students/StudentsPage';
import { AppShell } from './AppShell';
import { PublicLayout } from './PublicLayout';
import { LegalPage } from '../features/legal/LegalPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading, error, refetch } = useMe();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-ink-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="font-semibold">Can’t reach the Roster server.</p>
          <p className="mt-1 text-sm text-ink-muted">{error.message}</p>
          <button type="button" onClick={() => refetch()} className="mt-4 font-semibold text-brand underline">
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <AppShell>{children}</AppShell>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacy" element={<PublicLayout><LegalPage doc="privacy" /></PublicLayout>} />
      <Route path="/terms" element={<PublicLayout><LegalPage doc="terms" /></PublicLayout>} />
      <Route path="/cookies" element={<PublicLayout><LegalPage doc="cookies" /></PublicLayout>} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <StudentsPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
