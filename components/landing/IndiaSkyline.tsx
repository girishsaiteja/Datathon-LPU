export function IndiaSkyline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 170" className={className} fill="currentColor" aria-hidden>
      <g opacity="0.45">
        <path d="M12 160V72h14V54h44v18h14v88H68v-36H44v36H12zm40-52h8v20h-8V108z" />
        <path d="M110 160V48l11-8 11 8v112h-22zm6-72h10v8h-10v-8zm0 18h10v8h-10v-8z" />
        <path d="M164 160V86h8V72h16V86h8v74h-32zm12-46h8v16h-8v-16z" />
        <path d="M214 160V98h10V84c0-16 9-28 20-34 11 6 20 18 20 34v14h10v62h-60zm20-56c0-9 5-16 10-20 5 4 10 11 10 20v8h-20v-8z" />
        <circle cx="244" cy="46" r="4.5" />
        <path d="M304 160V80h12V66h20v14h12v80h-44zm18-42h8v20h-8v-20z" />
        <path d="M372 160V70h10v-12h8V70h10v90h-28zm8-48h4v14h-4v-14zm16 0h4v14h-4v-14z" />
        <path d="M430 160V58h14v102h-14zm20 0V84h12v76h-12zm18 0V70h16v90h-16z" />
        <path d="M502 160V96h14v64h-14z" />
        <rect x="0" y="158" width="560" height="4" rx="2" opacity="0.35" />
      </g>
    </svg>
  );
}
