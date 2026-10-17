import Link from "next/link";
import { CURRENT_RELEASE, PRODUCT_UPDATES } from "@/lib/product-updates";

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="m5 12.5 4.25 4.25L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <path d="M12 2.75c.55 4.95 3.3 7.7 8.25 8.25-4.95.55-7.7 3.3-8.25 8.25C11.45 14.3 8.7 11.55 3.75 11 8.7 10.45 11.45 7.7 12 2.75Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function WhatsNewContent() {
  const shipped = PRODUCT_UPDATES.filter((update) => update.status === "shipped");
  const comingSoon = PRODUCT_UPDATES.filter((update) => update.status === "coming-soon");

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="paper relative overflow-hidden rounded-3xl px-6 py-8 sm:px-10 sm:py-11">
        <div aria-hidden="true" className="absolute -right-16 -top-20 h-52 w-52 rounded-full border-[2.5rem] border-brass/20" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Product updates</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">What&rsquo;s new</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            A plain record of what Uncle Invoice can do today, the version you are using,
            and the next useful thing on the way.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5">
            <span className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-paper">
              Version {CURRENT_RELEASE.version}
            </span>
            <time dateTime={CURRENT_RELEASE.releasedOn} className="text-sm text-muted">
              Released {CURRENT_RELEASE.releasedLabel}
            </time>
          </div>
        </div>
      </header>

      <section aria-labelledby="shipped-heading">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Available now</p>
            <h2 id="shipped-heading" className="mt-1 text-3xl">Built and ready</h2>
          </div>
          <span className="hidden text-sm text-muted sm:block">{shipped.length} shipped features</span>
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {shipped.map((update) => (
            <li key={update.title} className="paper rounded-2xl p-5 sm:p-6">
              <div className="flex gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-olive text-paper">
                  <CheckIcon />
                </span>
                <div>
                  <h3 className="text-xl">{update.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{update.description}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="coming-heading" className="rounded-3xl border border-dashed border-brass bg-paper-2 p-6 sm:p-8">
        <div className="flex gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink">
            <SparkIcon />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Coming soon</p>
            <h2 id="coming-heading" className="mt-1 text-2xl">Next on the list</h2>
            <ul className="mt-4 space-y-4">
              {comingSoon.map((update) => (
                <li key={update.title}>
                  <h3 className="font-semibold">{update.title}</h3>
                  <p className="mt-1 text-sm text-muted">{update.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div>
        <Link href="/app" className="btn btn-ghost">← Back to dashboard</Link>
      </div>
    </div>
  );
}
