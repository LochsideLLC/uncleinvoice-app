/** Shared workspace icons. This module stays free of server-only imports so
    client components (dashboard tabs, metrics) can use the icons. */

export function DocumentIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 2.5h6l4 4v11H5v-15Z" />
      <path d="M11 2.5v4h4" />
      <path d="M7.5 11h5M7.5 13.5h5" />
    </svg>
  );
}

export function CalculatorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4.5" y="2.5" width="11" height="15" rx="2" />
      <path d="M7.5 6h5" />
      <path d="M7.5 10.5h.01M10 10.5h.01M12.5 10.5h.01M7.5 13.5h.01M10 13.5h.01M12.5 13.5h.01" />
    </svg>
  );
}
