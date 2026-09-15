/** Brand marks for Technology Stack — compact SVGs matching the About mock. */

export function PythonLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path
        fill="#3776AB"
        d="M31.8 6c-12.2 0-11.4 5.3-11.4 5.3l.01 5.5h11.6v1.6H15.3S6 17.7 6 31.9c0 14.2 7.8 13.7 7.8 13.7h4.7v-6.6s-.25-7.8 7.7-7.8h13.2s7.5.12 7.5-7.25V13.4S47.7 6 31.8 6zm-6.5 3.9a2.4 2.4 0 110 4.8 2.4 2.4 0 010-4.8z"
      />
      <path
        fill="#FFD43B"
        d="M32.2 58c12.2 0 11.4-5.3 11.4-5.3l-.01-5.5H32v-1.6h16.7S58 46.3 58 32.1c0-14.2-7.8-13.7-7.8-13.7h-4.7v6.6s.25 7.8-7.7 7.8H24.6s-7.5-.12-7.5 7.25v8.45S16.3 58 32.2 58zm6.5-3.9a2.4 2.4 0 110-4.8 2.4 2.4 0 010 4.8z"
      />
    </svg>
  );
}

export function SupabaseLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 109 113" className={className} aria-hidden>
      <path
        fill="#3ECF8E"
        d="M63.7 110.4c-2.8 3.5-8.5 1.6-8.5-2.9V2.9c0-4.5 5.7-6.4 8.5-2.9l45.3 56.8c2.4 3 2.4 7.2 0 10.2L63.7 110.4z"
      />
      <path
        fill="#3ECF8E"
        fillOpacity="0.4"
        d="M45.3 110.4c2.8 3.5 8.5 1.6 8.5-2.9V2.9c0-4.5-5.7-6.4-8.5-2.9L0 56.8c-2.4 3-2.4 7.2 0 10.2l45.3 43.4z"
      />
    </svg>
  );
}

export function NextjsLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" className={className} aria-hidden>
      <circle cx="64" cy="64" r="64" fill="#000" />
      <path
        fill="#fff"
        d="M36 40h12.5l27.2 40.4V40H88v48H76.2L48.2 46.2V88H36V40z"
      />
    </svg>
  );
}

export function RechartsLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="6" y="26" width="8" height="14" rx="2" fill="#22c55e" />
      <rect x="20" y="16" width="8" height="24" rx="2" fill="#3b82f6" />
      <rect x="34" y="8" width="8" height="32" rx="2" fill="#6366f1" />
    </svg>
  );
}

export function GeminiLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="gem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4F8BFF" />
          <stop offset="50%" stopColor="#7B61FF" />
          <stop offset="100%" stopColor="#1BA1E3" />
        </linearGradient>
      </defs>
      <path
        fill="url(#gem)"
        d="M24 4c1.2 8.6 7.4 14.8 16 16-8.6 1.2-14.8 7.4-16 16-1.2-8.6-7.4-14.8-16-16 8.6-1.2 14.8-7.4 16-16z"
      />
    </svg>
  );
}
