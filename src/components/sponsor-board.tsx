import type { Sponsor } from "@prisma/client";
import { SponsorMark } from "@/components/sponsor-mark";

const LOCAL_LOGOS: Record<string, string> = {
  "bookkeeping-conroe": "/images/sponsors/bookkeeping-conroe.png",
  "southwest-digital": "/images/sponsors/southwest-digital.png",
};

const CARD_COPY: Record<string, string> = {
  "bookkeeping-conroe":
    "Bookkeeping and cleanups so you can focus on running your business.",
  "southwest-digital": "Websites, ads, and the kind of marketing that pays for itself.",
};

const CARD_NAMES: Record<string, string> = {
  "southwest-digital": "Southwest Digital Marketing",
};

function oneSentence(text: string | null): string | null {
  if (!text) return null;
  const match = text.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : text).trim();
}

export function SponsorBoard({
  featured,
  rest,
}: {
  featured: Sponsor[];
  rest: Sponsor[];
}) {
  const sponsors = [...featured, ...rest];
  if (sponsors.length === 0) return null;

  return (
    <section aria-label="Sponsors" className="w-full border-t border-line">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 pb-6 pt-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,4fr)] xl:gap-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Our sponsors
          </p>
          <h2 className="display mt-2 text-3xl leading-tight text-ink">
            Helping your business grow.
          </h2>
        </div>
        <div className="grid content-start gap-5 xl:grid-cols-2">
          {sponsors.map((sponsor) => {
            const logo = LOCAL_LOGOS[sponsor.slug] ?? sponsor.logoUrl;
            const name = CARD_NAMES[sponsor.slug] ?? sponsor.name;
            const description =
              CARD_COPY[sponsor.slug] ?? oneSentence(sponsor.tagline);
            return (
              <a
                key={sponsor.id}
                href={sponsor.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name} — Learn more (opens in a new tab)`}
                className="paper group flex flex-col overflow-hidden rounded-[1.3rem] border border-line transition-shadow hover:shadow-lg"
              >
                <div className="flex min-w-0 flex-1 flex-col p-3">
                  <div className="flex items-center gap-2.5">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logo}
                        alt=""
                        loading="lazy"
                        className="h-6 w-6 shrink-0 rounded-md bg-white object-contain"
                      />
                    ) : (
                      <SponsorMark name={sponsor.name} />
                    )}
                    <p className="display min-w-0 text-sm font-semibold leading-tight text-ink">
                      {name}
                    </p>
                  </div>
                  {description ? (
                    <p className="sponsor-desc mt-1 text-muted">
                      {description}
                    </p>
                  ) : null}
                  <span className="link-accent mt-1 inline-flex items-center gap-1 text-xs font-semibold">
                    Learn more
                    <span
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
