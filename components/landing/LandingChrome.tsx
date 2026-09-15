export function SoftLandingBg() {
  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="waveA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#eff6ff" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="waveB" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0e7ff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#f0f9ff" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <path
          fill="url(#waveA)"
          d="M0 0h1200v220C980 280 820 160 640 210 420 270 280 180 0 240V0z"
        />
        <path
          fill="url(#waveB)"
          d="M1200 120c-180 80-320-20-480 40s-280 90-420 40c-90-30-180-10-300 30v180c140-40 250-20 360 10 200 50 340-40 520-20 140 16 260 70 320 110V120z"
          opacity="0.7"
        />
        <path
          fill="#dbeafe"
          opacity="0.28"
          d="M0 780c160-40 300 10 460-15s300-55 460-20 180 50 280 70v85H0V780z"
        />
      </svg>

      <div
        className="pointer-events-none absolute right-10 top-16 hidden h-28 w-36 opacity-40 sm:block"
        style={{
          backgroundImage: "radial-gradient(#94a3b8 1.4px, transparent 1.4px)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="pointer-events-none absolute -right-16 top-40 h-80 w-80 rounded-full bg-sky-200/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-32 left-8 h-64 w-64 rounded-full bg-indigo-100/40 blur-3xl" />
    </>
  );
}

export function LandingTopBar() {
  return (
    <div className="relative z-20 flex items-center justify-end">
      <div className="flex items-center gap-2.5 text-[13px] font-medium text-slate-500">
        <span>Detect</span>
        <span className="text-slate-300">·</span>
        <span>Analyze</span>
        <span className="text-slate-300">·</span>
        <span>Prevent</span>
      </div>
    </div>
  );
}

export function LandingFooter() {
  return (
    <div className="relative z-10 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/90 pt-4 text-[12.5px]">
      <div className="flex flex-wrap gap-6 font-medium text-slate-500">
        <span>Banks</span>
        <span>Merchants</span>
        <span>Users</span>
        <span>Regulators</span>
      </div>
      <div className="font-semibold text-[#2563eb]">A Safer UPI Ecosystem</div>
    </div>
  );
}
