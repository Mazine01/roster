export function Wordmark({ className = '', light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill={light ? 'rgb(251 252 250 / 0.12)' : '#1F3D36'} />
        <rect x="8" y="9" width="16" height="3" rx="1.5" fill="#FBFCFA" />
        <rect x="8" y="15" width="16" height="3" rx="1.5" fill="#F2D63B" />
        <rect x="8" y="21" width="10" height="3" rx="1.5" fill="#FBFCFA" />
      </svg>
      <span className="text-lg font-bold tracking-tight">Roster</span>
    </span>
  );
}
