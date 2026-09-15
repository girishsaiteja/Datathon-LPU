export function PhoneMockup() {
  return (
    <div className="relative mx-auto h-[430px] w-[230px]">
      <div className="absolute -inset-8 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="relative h-full w-full rounded-[36px] border-[8px] border-[#1b2a44] bg-[#0b1730] shadow-[0_30px_60px_rgba(0,0,0,0.45)]">
        <div className="absolute left-1/2 top-2 h-4 w-20 -translate-x-1/2 rounded-full bg-[#0a1222]" />
        <div className="phone-shine absolute inset-0 rounded-[28px]" />
        <div className="flex h-full flex-col items-center justify-center px-5 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 to-brand-600 shadow-[0_12px_24px_rgba(47,107,255,0.45)]">
            <span className="text-2xl font-black text-white">UPI</span>
          </div>
          <div className="text-[13px] font-semibold tracking-[0.18em] text-sky-100">UPI</div>
          <div className="mt-6 flex h-[88px] w-[88px] items-center justify-center rounded-full border-4 border-sky-300/80 bg-gradient-to-br from-brand-400 to-cyan-400 shadow-[0_0_30px_rgba(56,189,248,0.45)]">
            <svg viewBox="0 0 48 48" className="h-12 w-12 text-white">
              <path
                fill="currentColor"
                d="M24 6l14 6v10.5c0 8.7-5.8 16.6-14 18.7-8.2-2.1-14-10-14-18.7V12l14-6z"
              />
              <path fill="#0b1730" d="M21.2 24.8l-3.4-3.4 2.1-2.1 1.3 1.3 6.4-6.4 2.1 2.1z" />
            </svg>
          </div>
          <div className="mt-5 text-[15px] font-bold text-white">Secure</div>
          <div className="text-[15px] font-bold text-white">Transact</div>
          <div className="text-[15px] font-bold text-cyan-200">Trust</div>
        </div>
      </div>
    </div>
  );
}
