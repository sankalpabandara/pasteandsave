// The PasteAndSave mark: a glassy gradient badge with a download glyph
// (an arrow saving into a tray). Reusable at any size via className.
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="PasteAndSave"
    >
      <defs>
        <linearGradient id="ps-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="55%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#ps-grad)" />
      <rect x="1" y="1" width="38" height="18" rx="11" fill="#ffffff" opacity="0.14" />
      <g
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M20 9.5 V22" />
        <path d="M14.3 16.7 L20 22.6 L25.7 16.7" />
        <path d="M12 27.5 H28" />
      </g>
    </svg>
  );
}

// Full logo: mark plus wordmark, for the header and footer.
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <LogoMark className="h-8 w-8" />
      <span className="font-display text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
        PasteAnd<span className="text-violet-600 dark:text-violet-400">Save</span>
      </span>
    </span>
  );
}
