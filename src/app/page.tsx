import Image from "next/image";
import Link from "next/link";
import { listSponsors } from "@/lib/sponsors";
import { SponsorBoard } from "@/components/sponsor-board";
import { HomeSections } from "@/components/home-sections";

const CHECKLIST = [
  "No account required",
  "Professional invoices in minutes",
  "Mark invoices as paid (optional)",
  "Print or download PDF",
  "Email it yourself (or create a free account to email directly through Uncle Invoice)",
];

export default async function HomePage() {
  const { featured, rest } = await listSponsors();

  return (
    <div className="flex min-h-full flex-col">
      <main className="flex flex-1 flex-col">
        <section className="mx-auto grid w-full max-w-7xl items-center gap-8 px-6 pb-6 pt-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:pt-6">
          <div>
            <h1 className="text-5xl leading-[1.05] text-ink sm:text-6xl">
              Create invoices for free. Get paid.
            </h1>
            <p className="mt-4 text-xl leading-relaxed text-muted">
              Professional invoices in minutes. No account required to get
              started.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/create"
                className="btn btn-primary btn-hero btn-block w-full"
              >
                Create Invoice — Free
              </Link>
            </div>
            <ul className="mt-6 space-y-2">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-3 text-ink">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="8.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M7 10.2l2.1 2.1L13.2 8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Image
              src="/images/contractor-paid-hero.webp"
              alt="Smiling contractor cheering with raised fists beside a laptop and a printed page showing her paid invoice"
              width={1672}
              height={941}
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="w-full rounded-[1.4rem] shadow-lg"
            />
          </div>
        </section>
        <SponsorBoard featured={featured} rest={rest} />
        <HomeSections />
      </main>
    </div>
  );
}
