import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy — Uncle Invoice",
  description:
    "What Uncle Invoice collects, why, who else sees it, and how to get your data deleted.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      updated="October 13, 2026"
      intro="Uncle Invoice holds invoices, and invoices are personal. This page says plainly what we keep, why we keep it, and who else can see it."
    >
      <LegalSection heading="Who we are">
        <p className="text-muted">
          Uncle Invoice is operated by Lochside LLC. If you want anything on this page
          explained, or you want your data removed, write to{" "}
          <a className="text-ink underline" href="mailto:hello@uncleinvoice.com">
            hello@uncleinvoice.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="The short version">
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>We do not sell your data, and we never will.</li>
          <li>
            There are no advertising trackers and no analytics scripts on this site. We do
            not know which pages you visited.
          </li>
          <li>
            There is one cookie. It keeps you signed in. That is its entire job.
          </li>
          <li>Ask us to delete your account and we will delete it.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="What we collect">
        <p className="text-muted">Only what the product needs to work.</p>
        <p>
          <strong>Your account.</strong>{" "}
          <span className="text-muted">
            Your email address and name. Your password, stored only as a bcrypt hash — we
            cannot read it, and neither can anyone who takes a copy of our database. If you
            fill in your business details, we hold those too: business name, email, phone,
            postal address, tax ID, and any logo you upload. All of that is optional, and
            all of it exists so it can be printed on your invoices.
          </span>
        </p>
        <p>
          <strong>If you sign in with Google.</strong>{" "}
          <span className="text-muted">
            We receive your name, email address and whether Google has verified it. We do
            not receive your password and we do not read your Gmail, Drive or contacts.
          </span>
        </p>
        <p>
          <strong>The people you invoice.</strong>{" "}
          <span className="text-muted">
            If you add contractors, we hold the name, email, phone, address, tax ID and any
            notes you enter about them. You are entering information about other people, so
            please only enter what you have a reason to hold.
          </span>
        </p>
        <p>
          <strong>The invoices themselves.</strong>{" "}
          <span className="text-muted">
            Amounts, dates, line descriptions, what has been paid, and who confirmed the
            invoice and when. We keep a short activity log on each invoice — created, sent
            for review, confirmed — so there is a record of what happened to it.
          </span>
        </p>
        <p>
          <strong>Invoices made without an account.</strong>{" "}
          <span className="text-muted">
            You can build an invoice at{" "}
            <Link className="text-ink underline" href="/create">
              /create
            </Link>{" "}
            without signing up. That invoice is still stored on our servers, and it is
            reachable by anyone holding its link. Treat the link as private.
          </span>
        </p>
        <p>
          <strong>Email we have sent.</strong>{" "}
          <span className="text-muted">
            We keep a copy of messages the product sends on your behalf — sign-in links and
            invoice review links — so there is a record that they went out.
          </span>
        </p>
        <p>
          <strong>Ordinary server records.</strong>{" "}
          <span className="text-muted">
            Our hosting provider keeps request logs, which include IP addresses, for a
            short period. This is normal infrastructure logging, not something we analyse.
          </span>
        </p>
      </LegalSection>

      <LegalSection heading="Cookies">
        <p className="text-muted">
          One cookie, named <code className="text-ink">ir_session</code>. It is set when you
          sign in, lasts 30 days, and cannot be read by JavaScript. Without it you cannot
          stay signed in, so there is nothing to consent to and nothing to turn off. We set
          no advertising, analytics or cross-site cookies of any kind.
        </p>
      </LegalSection>

      <LegalSection heading="Links in email are keys">
        <p className="text-muted">
          Two kinds of email we send contain a link that works without a password: a
          sign-in link, and a link asking a contractor to review an invoice. Anyone holding
          that link can do what the link allows, so treat one like a password. Sign-in links
          expire after 2 hours and stop working the moment they are used once. Invoice
          review links expire after 7 days and stop working once the invoice is confirmed.
        </p>
      </LegalSection>

      <LegalSection heading="Who else sees your data">
        <p className="text-muted">
          We use a small number of companies to run the service. They process data on our
          instructions and for no other purpose.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>
            <strong className="text-ink">Netlify</strong> — hosts the site and runs the code.
          </li>
          <li>
            <strong className="text-ink">Supabase</strong> — hosts the database where your
            invoices are stored.
          </li>
          <li>
            <strong className="text-ink">Cloudflare</strong> — answers DNS for this domain.
          </li>
          <li>
            <strong className="text-ink">Google</strong> — only if you choose to sign in with
            Google.
          </li>
          <li>
            <strong className="text-ink">An email provider</strong> — only when email
            delivery is switched on, and only for messages addressed to you or to someone
            you asked us to contact.
          </li>
        </ul>
        <p className="text-muted">
          We do not sell your data, rent it, or hand it to advertisers. We will disclose it
          if the law actually requires it, and not otherwise.
        </p>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <p className="text-muted">
          Account and invoice data stays until you ask us to remove it. Expired sign-in and
          review links are dead on arrival whether or not the row is still there. Ask us to
          delete your account and we will delete the account, its workspaces, its
          contractors and its invoices.
        </p>
      </LegalSection>

      <LegalSection heading="Your choices">
        <p className="text-muted">
          You can see and change most of what we hold from your profile page, and you can
          edit or delete invoices and contractors yourself. For anything else — a copy of
          your data, a correction, or deletion — write to{" "}
          <a className="text-ink underline" href="mailto:hello@uncleinvoice.com">
            hello@uncleinvoice.com
          </a>{" "}
          and we will deal with it. Depending on where you live you may have a formal right
          to these things; we would rather just do them than argue about which law applies.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p className="text-muted">
          Uncle Invoice is a tool for people doing paid work, and it is not designed or
          intended for children under 13. Please do not create an account if you are under
          13. If you believe a child under 13 has given us personal information, write to us
          and we will delete it.
        </p>
      </LegalSection>

      <LegalSection heading="Security, honestly stated">
        <p className="text-muted">
          Passwords are hashed, traffic is encrypted in transit, the database is encrypted
          at rest, and sign-in links are single use. That is a reasonable standard of care,
          and it is not a guarantee. No service can promise it will never be breached, and
          we are not going to be the first to try.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p className="text-muted">
          If we change this page we will change the date at the top. If a change actually
          matters — new data collected, or a new company handling it — we will tell account
          holders by email rather than quietly editing the page.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
