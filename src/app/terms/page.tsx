import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms — Uncle Invoice",
  description:
    "The agreement for using Uncle Invoice: what the service does, what you are responsible for, and the limits of what we promise.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="October 13, 2026"
      intro="This is the agreement between you and us for using Uncle Invoice. We have tried to write it in words you can actually read."
    >
      <LegalSection heading="Who we are, and agreeing to this">
        <p className="text-muted">
          Uncle Invoice is operated by Lochside LLC. By creating an account or using the
          site, you agree to what is on this page. If you do not agree, please do not use
          the service. Questions go to{" "}
          <a className="text-ink underline" href="mailto:hello@uncleinvoice.com">
            hello@uncleinvoice.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What Uncle Invoice does">
        <p className="text-muted">
          It helps you make an invoice. You can build one at{" "}
          <Link className="text-ink underline" href="/create">
            /create
          </Link>{" "}
          without an account, or sign up and keep a history of them. A bookkeeper can
          prepare a draft invoice from a client&rsquo;s books and send the contractor a link
          to review, correct and confirm it.
        </p>
      </LegalSection>

      <LegalSection heading="The invoice is yours, and so is its accuracy">
        <p className="text-muted">
          This is the most important paragraph on the page, so we will not bury it.
        </p>
        <p className="text-muted">
          A draft prepared for you is a starting point, nothing more. When you confirm an
          invoice you are saying it is accurate. Check the amounts, the dates, the
          description of the work, and who it is addressed to. We do not verify any of it,
          we cannot know whether the work happened, and we are not a party to the agreement
          between you and whoever you are invoicing.
        </p>
        <p className="text-muted">
          If a bookkeeper prepared your draft, it is still your invoice and still your
          responsibility.
        </p>
      </LegalSection>

      <LegalSection heading="We are not your accountant or your lawyer">
        <p className="text-muted">
          Nothing in this product is tax, legal or accounting advice. An invoice made here
          is not a tax filing and does not decide how anything should be reported. If the
          numbers matter — and with tax they usually do — talk to someone qualified who has
          seen your actual situation.
        </p>
      </LegalSection>

      <LegalSection heading="Your account">
        <p className="text-muted">
          Give us an email address that is really yours, and keep your password to
          yourself. Some of our emails contain links that sign you in or open an invoice
          without a password — treat those links the way you would treat a password, and do
          not forward them. You are responsible for what happens under your account. Tell us
          promptly if you think someone else is in it.
        </p>
      </LegalSection>

      <LegalSection heading="Other people's information">
        <p className="text-muted">
          If you add contractors or clients, you are putting other people&rsquo;s details
          into our system. You are responsible for having a legitimate reason to hold them
          and for keeping them accurate. Do not use Uncle Invoice to send anyone invoices
          they have not agreed to receive.
        </p>
      </LegalSection>

      <LegalSection heading="Things you may not do">
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>Create invoices for work that did not happen, or for amounts that are not owed.</li>
          <li>Impersonate another person or business.</li>
          <li>Upload anything unlawful, or anything you do not have the right to use.</li>
          <li>Try to reach accounts, workspaces or invoices that are not yours.</li>
          <li>Attack, overload, or probe the service, or scrape it automatically.</li>
          <li>Resell the service as if it were your own.</li>
        </ul>
        <p className="text-muted">
          We can suspend or close an account that does these things.
        </p>
      </LegalSection>

      <LegalSection heading="What it costs">
        <p className="text-muted">
          Uncle Invoice is free to use today, and there is no paid plan you can buy yet.
          We expect to offer one, and when we do we will say clearly what it costs before
          charging anyone anything. We are not going to put a price behind work you have
          already created — your existing invoices stay available to you.
        </p>
      </LegalSection>

      <LegalSection heading="Your content stays yours">
        <p className="text-muted">
          Your invoices, your logo and your business details belong to you. You give us
          permission to store, process and display them only so far as running the service
          requires — showing you your invoices, rendering a PDF, sending a review link you
          asked us to send. We do not claim ownership and we do not use your content to
          advertise.
        </p>
      </LegalSection>

      <LegalSection heading="Availability">
        <p className="text-muted">
          We will try to keep the service up and we will not always succeed. There is no
          uptime guarantee here. We may change features, and we may take the service down
          for maintenance. If we ever decide to shut it down for good, we will give account
          holders reasonable notice and a way to export their invoices first.
        </p>
      </LegalSection>

      <LegalSection heading="Keep your own copy">
        <p className="text-muted">
          Download the PDFs of invoices that matter to you. We take backups, but your books
          are your responsibility and you should not rely on us as your only copy.
        </p>
      </LegalSection>

      <LegalSection heading="No warranty">
        <p className="text-muted">
          The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without
          warranties of any kind, express or implied, including any implied warranty of
          merchantability, fitness for a particular purpose, or non-infringement. We do not
          warrant that it will be uninterrupted, error-free, or that it will meet your
          requirements.
        </p>
      </LegalSection>

      <LegalSection heading="Limits on what we owe you">
        <p className="text-muted">
          To the fullest extent the law allows, we are not liable for indirect, incidental,
          special or consequential damages, or for lost profits, lost revenue, lost data or
          lost business, arising out of your use of the service. Our total liability to you
          for any claim is limited to the greater of the amount you paid us in the twelve
          months before the claim, or one hundred US dollars.
        </p>
        <p className="text-muted">
          Some places do not allow these limits. Where that is true, they apply to you only
          as far as that place allows.
        </p>
      </LegalSection>

      <LegalSection heading="Ending it">
        <p className="text-muted">
          You can stop using Uncle Invoice whenever you like, and you can ask us to delete
          your account at any time. We can suspend or close an account that breaks these
          terms or that puts the service or other users at risk. The sections about
          accuracy, warranties and liability survive the account being closed.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to these terms">
        <p className="text-muted">
          If we change this page we will change the date at the top. For a change that
          genuinely affects your rights, we will email account holders rather than quietly
          editing the page. Continuing to use the service after a change means you accept
          it.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p className="text-muted">
          These terms are governed by the laws of the State of Texas, United States,
          without regard to its conflict of law rules. Disputes go to the state or federal
          courts located in Texas.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p className="text-muted">
          <a className="text-ink underline" href="mailto:hello@uncleinvoice.com">
            hello@uncleinvoice.com
          </a>
          . Our{" "}
          <Link className="text-ink underline" href="/privacy">
            privacy page
          </Link>{" "}
          explains what we do with your data.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
