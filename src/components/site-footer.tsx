import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="print:hidden mt-auto border-t border-line py-8 text-center text-muted">
      <p className="display text-base">Uncle Invoice</p>
      <nav className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
        <Link href="/how-it-works" className="hover:text-ink transition-colors">How it works</Link>
        <Link href="/privacy" className="hover:text-ink transition-colors">Privacy</Link>
        <Link href="/terms" className="hover:text-ink transition-colors">Terms</Link>
        <Link href="/cookies" className="hover:text-ink transition-colors">Cookies</Link>
        <Link href="mailto:hello@uncleinvoice.com" className="hover:text-ink transition-colors">Contact</Link>
        <Link href="/partners" className="hover:text-ink transition-colors">Partners</Link>
      </nav>
      <p className="mt-3 text-xs">© {new Date().getFullYear()} Uncle Invoice</p>
    </footer>
  );
}
