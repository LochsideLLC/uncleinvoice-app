import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms — Uncle Invoice",
  description:
    "The agreement for using Uncle Invoice, including account, invoice, content, and liability terms.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="October 17, 2026"
      intro="These Terms of Service are the agreement between you and Lochside LLC for using Uncle Invoice."
    >
      <LegalSection heading="Accepting these terms">
        <p className="text-muted">
          Lochside LLC operates Uncle Invoice. By accessing or using the service, you agree
          to these terms and our{" "}
          <Link className="text-ink underline" href="/privacy">
            Privacy Policy
          </Link>
          . If you do not agree, do not use the service. You must be legally able to enter
          this agreement. If you use Uncle Invoice for a company or another person, you
          confirm that you have authority to bind them to these terms.
        </p>
      </LegalSection>

      <LegalSection heading="What the service does">
        <p className="text-muted">
          Uncle Invoice helps people create, store, review, confirm, download, and send
          invoices. You can create an invoice at{" "}
          <Link className="text-ink underline" href="/create">
            /create
          </Link>{" "}
          without signing in. Signed-in users can keep invoice history and use other
          features available to their account plan. A bookkeeper can also prepare draft
          invoices from a client&rsquo;s records for a contractor to review and confirm.
        </p>
      </LegalSection>

      <LegalSection heading="Your account and links">
        <p className="text-muted">
          Give us accurate account information and keep your password and private links
          secure. Some links open an account, invoice, PDF, or supporting document without
          a password. You are responsible for activity under your account and for sharing
          those links only with intended recipients. Tell us promptly if you believe your
          account or a private link has been compromised.
        </p>
      </LegalSection>

      <LegalSection heading="Invoice accuracy is your responsibility">
        <p className="text-muted">
          Drafts, imports, totals, PDFs, and other output are tools. You must review the
          parties, amounts, dates, descriptions, tax treatment, payment status, and every
          other detail before relying on or sending an invoice. We do not verify that work
          occurred, that an amount is owed, or that an invoice satisfies a contract or a
          legal requirement. If a bookkeeper prepared the draft, it remains the issuer&rsquo;s
          responsibility to review and approve it.
        </p>
      </LegalSection>

      <LegalSection heading="No professional advice">
        <p className="text-muted">
          Uncle Invoice does not provide tax, legal, accounting, or financial advice. An
          invoice is not a tax filing and does not decide how a transaction should be
          reported. Consult a qualified professional who knows your circumstances when you
          need professional advice.
        </p>
      </LegalSection>

      <LegalSection heading="Information about other people">
        <p className="text-muted">
          You are responsible for having a lawful and legitimate reason to enter, use, and
          share information about clients, contractors, employees, or anyone else. Keep it
          accurate, limit it to what is needed, and do not send messages or invoices to a
          person who should not receive them.
        </p>
      </LegalSection>

      <LegalSection heading="Your content">
        <p className="text-muted">
          You keep ownership of content you submit, including invoice data, logos, notes,
          and supporting documents. You give Lochside LLC a non-exclusive license to host,
          copy, process, display, format, and transmit that content only as needed to run,
          secure, and support the service and comply with law. You confirm that
          you have the rights needed to submit the content and grant this license.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p className="text-muted">You may not use Uncle Invoice to:</p>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>Create a false invoice or misrepresent work, identity, payment, or authority.</li>
          <li>Upload unlawful, malicious, infringing, or unauthorized content.</li>
          <li>Access another account, workspace, invoice, file, or link without permission.</li>
          <li>Send spam, malware, or deceptive messages.</li>
          <li>Probe, disrupt, overload, scrape, or reverse engineer the service.</li>
          <li>Bypass a security control or account-plan restriction.</li>
          <li>Resell or present the service as your own without written permission.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Plans, prices, and payment">
        <p className="text-muted">
          Some features depend on the plan assigned to an account. Uncle Invoice does not
          currently take card payments or offer self-service checkout. Plan requests open
          an email for the user to review and send; sending a request does not itself
          activate a plan or charge money. If Lochside LLC offers a paid plan, its price,
          billing period, and any additional terms will be stated before the paid service
          begins.
        </p>
      </LegalSection>

      <LegalSection heading="Our service and intellectual property">
        <p className="text-muted">
          Lochside LLC and its licensors own Uncle Invoice, including its software, design,
          branding, and documentation, except for content supplied by users or third
          parties. Subject to these terms, we give you a limited, revocable,
          non-transferable right to use the service for its intended business purpose.
        </p>
      </LegalSection>

      <LegalSection heading="Third-party services">
        <p className="text-muted">
          Uncle Invoice relies on third-party hosting, database, email, sign-in, DNS, and
          embedded-media services. Their services can fail or change, and their own terms
          and privacy policies apply when you interact with them. Lochside LLC is not
          responsible for a third-party website or service that it does not control.
        </p>
      </LegalSection>

      <LegalSection heading="Availability and changes">
        <p className="text-muted">
          The service may be unavailable, delayed, changed, or discontinued. We do not
          promise a particular uptime or that every feature will remain available. Keep
          copies of invoices and records you need for your business. We may change the
          service, add or remove features, or suspend access for maintenance, security, or
          legal reasons.
        </p>
      </LegalSection>

      <LegalSection heading="Suspension, closure, and deletion">
        <p className="text-muted">
          You may stop using the service at any time and may request account closure or
          deletion. We may suspend or close access if you break these terms, create risk
          for the service or another person, fail to pay an agreed charge, or if the law
          requires it. When access ends, provisions that by their nature should continue
          will survive, including ownership, disclaimers, liability limits, and dispute
          terms.
        </p>
      </LegalSection>

      <LegalSection heading="No warranty">
        <p className="text-muted">
          To the fullest extent allowed by law, the service is provided &ldquo;as is&rdquo;
          and &ldquo;as available.&rdquo; Lochside LLC disclaims express and implied
          warranties, including merchantability, fitness for a particular purpose,
          non-infringement, and any warranty that the service will be uninterrupted,
          secure, accurate, or error-free.
        </p>
      </LegalSection>

      <LegalSection heading="Limits on liability">
        <p className="text-muted">
          To the fullest extent allowed by law, Lochside LLC and its owners, employees,
          contractors, and service providers will not be liable for indirect, incidental,
          special, consequential, exemplary, or punitive damages, or for lost profits,
          revenue, data, goodwill, or business opportunity arising from the service.
        </p>
        <p className="text-muted">
          To the fullest extent allowed by law, their total liability for all claims
          arising from the service will not exceed the greater of the amount you paid to
          Lochside LLC for Uncle Invoice during the 12 months before the event giving rise
          to the claim or US $100. Some laws do not allow certain exclusions or limits, so
          those provisions apply only to the extent permitted.
        </p>
      </LegalSection>

      <LegalSection heading="Your responsibility for claims">
        <p className="text-muted">
          To the extent allowed by law, you will defend and indemnify Lochside LLC and its
          owners, employees, and contractors from third-party claims, damages, and
          reasonable costs arising from your content, your misuse of the service, or your
          violation of these terms or another person&rsquo;s rights.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law and courts">
        <p className="text-muted">
          Texas law governs these terms, without regard to conflict-of-law rules. Any
          dispute that is not resolved informally must be brought in a state or federal
          court with jurisdiction in Texas, and each party consents to those courts.
        </p>
      </LegalSection>

      <LegalSection heading="Other legal terms">
        <p className="text-muted">
          These terms and the policies they link to are the entire agreement about the
          service unless Lochside LLC gives you separate written terms. If one provision is
          unenforceable, the rest remain in effect. A delay in enforcing a provision is not
          a waiver. You may not assign this agreement without our written consent; Lochside
          LLC may assign it as part of a merger, reorganization, financing, or sale of the
          service or business.
        </p>
      </LegalSection>

      <LegalSection heading="Changes and contact">
        <p className="text-muted">
          We will update the date above when these terms change. If a change materially
          affects existing users&rsquo; rights, we will provide notice appropriate to the
          change. Continuing to use the service after the updated terms take effect means
          you accept them. Legal notices and questions about these terms can be sent to{" "}
          <a className="text-ink underline" href="mailto:notices@uncleinvoice.com">
            notices@uncleinvoice.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
