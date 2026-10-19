import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";

export const metadata: Metadata = {
  title: "Bookkeeping Referral Partner Program — Bookkeeping Conroe",
  description: "Earn income and hands-on experience by referring bookkeeping clients to Bookkeeping Conroe. Built for bookkeepers who want to grow.",
};

export default function BookkeepingConroePartnersPage() {
  return (
    <PageContainer>
      <section className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-3xl leading-tight sm:text-4xl">
          Earn income and experience referring bookkeeping clients
        </h1>
        <img
          src="/images/partner-receiving-business-card.webp"
          alt="Partner receiving a business card"
          className="mx-auto w-full max-w-4xl rounded-2xl shadow-md"
        />
        <a
          href="mailto:partners@bookkeepingconroe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-hero"
        >
          Email us to get started
        </a>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-line bg-paper p-6">
        <h2 className="text-2xl">Who This Is For</h2>
        <p className="leading-relaxed">
          This program is for bookkeepers who want more — more clients, more
          hands-on experience, and a real path toward growing their career.
        </p>
        <p className="leading-relaxed">
          As a referral partner, you&apos;ll introduce local business owners to
          a <strong>free QuickBooks inspection</strong>. When those referrals
          become paying clients, you get paid. And because you&apos;ll be
          conducting the inspection alongside Thomas, you&apos;ll build practical,
          real-world bookkeeping experience with every engagement.
        </p>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl">How It Works</h2>
        <ol className="flex flex-col gap-6">
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink">1</span>
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Email us and we&apos;ll get on a quick call</p>
              <p className="text-sm leading-relaxed text-muted">
                We want to get a sense of who you are and make sure the program
                is a good fit. If it is, we&apos;ll walk you through everything
                you need to know — it&apos;s a short conversation.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink">2</span>
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Ask local business owners if they&apos;d like a free QuickBooks inspection</p>
              <p className="text-sm leading-relaxed text-muted">
                When someone says yes, all you need to do is get their email
                address and send it our way. We handle everything from there.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink">3</span>
            <div className="flex flex-col gap-1">
              <p className="font-semibold">We keep you in the loop</p>
              <p className="text-sm leading-relaxed text-muted">
                Every time we reach out to your referral, we&apos;ll BCC you.
                You&apos;ll always know exactly where things stand — no need to
                follow up and ask.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">What You&apos;ll Earn</h2>
        <ul className="flex flex-col gap-3 rounded-xl border border-line bg-paper p-6 text-base">
          <li>
            <strong>$25/hr</strong> for approved QuickBooks inspection work
          </li>
          <li>
            <strong>100%</strong> of the client&apos;s first month of recurring
            fees if your referral becomes a paying client
          </li>
          <li>
            <strong>10%</strong> of any cleanup or catch-up fees collected
          </li>
        </ul>
        <p className="leading-relaxed text-muted">
          Partners who generate work and show aptitude are the first people we
          look to when we&apos;re ready to bring someone on. This isn&apos;t a
          guarantee — but it&apos;s the most direct path we have.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Why Bookkeeping Conroe</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="aspect-video w-full overflow-hidden rounded-xl">
            <iframe
              src="https://www.youtube.com/embed/LurgRg8AYNU"
              title="Thomas — video 1"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
          <div className="aspect-video w-full overflow-hidden rounded-xl">
            <iframe
              src="https://www.youtube.com/embed/qLCqTZ0kvfY"
              title="Thomas — video 2"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-paper p-6">
        <div className="grid gap-8 sm:grid-cols-2 sm:items-center">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl">Meet Our Team</h2>
            <p className="leading-relaxed">
              Bookkeeping Conroe is a small but growing firm launched in 2025. We
              take very good care of our clients — that&apos;s the whole business
              model.
            </p>
            <p className="leading-relaxed">
              Our founder is a former QuickBooks bookkeeper and consultant who
              started the firm to bring real, hands-on bookkeeping expertise to
              local small businesses. We&apos;re QuickBooks specialists, and
              we&apos;re proud members of the Conroe Chamber of Commerce.
            </p>
          </div>
          <img
            src="/ribbon-cutting-01.webp"
            alt="Bookkeeping Conroe ribbon cutting ceremony"
            className="w-full rounded-lg object-cover"
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Interested?</h2>
        <p className="leading-relaxed">
          We keep the program small so we can support each partner well. Reach
          out and we&apos;ll set up a quick conversation to see if it&apos;s a
          good fit.
        </p>
        <a
          href="mailto:partners@bookkeepingconroe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary self-start"
        >
          Email us to get started
        </a>
      </section>

      <footer className="border-t border-line pt-6 text-sm text-muted">
        Questions?{" "}
        <a
          href="mailto:partners@bookkeepingconroe.com"
          className="text-accent hover:text-accent-hover"
        >
          partners@bookkeepingconroe.com
        </a>
      </footer>
    </PageContainer>
  );
}
