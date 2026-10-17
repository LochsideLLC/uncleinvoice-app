import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy — Uncle Invoice",
  description:
    "How Lochside LLC collects, uses, shares, and keeps information through Uncle Invoice.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 17, 2026"
      intro="Uncle Invoice holds account details, business records, and invoices. This policy explains what Lochside LLC collects through the service, why we use it, and who can receive it."
    >
      <LegalSection heading="Who is responsible for your information">
        <p className="text-muted">
          Lochside LLC operates Uncle Invoice. Questions and privacy requests can be sent
          to{" "}
          <a className="text-ink underline" href="mailto:notices@uncleinvoice.com">
            notices@uncleinvoice.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="The short version">
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>We use information to provide and protect Uncle Invoice.</li>
          <li>We do not sell personal information.</li>
          <li>
            We do not currently use advertising cookies or analytics cookies to track
            how you use the site.
          </li>
          <li>
            Invoices, supporting documents, and passwordless links may contain sensitive
            business information. Share them carefully.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Information we collect">
        <p>
          <strong>Account and profile information.</strong>{" "}
          <span className="text-muted">
            This can include your name, email address, backup email, password hash,
            account plan, email signature, and account status. If you add business
            details, we can also store a business name, email, phone number, mailing
            address, tax ID, and uploaded logos.
          </span>
        </p>
        <p>
          <strong>Google sign-in information.</strong>{" "}
          <span className="text-muted">
            If you choose Google sign-in, Google gives us your name, email address, and
            whether that address is verified. We do not receive your Google password or
            request access to Gmail, Drive, or contacts.
          </span>
        </p>
        <p>
          <strong>Client and contractor information.</strong>{" "}
          <span className="text-muted">
            Workspaces and contractor records can include names, contact details,
            addresses, tax IDs, notes, roles, and the relationship between an account and
            a workspace. Only add information you are allowed to use for this purpose.
          </span>
        </p>
        <p>
          <strong>Invoice and payment information.</strong>{" "}
          <span className="text-muted">
            We store invoice numbers, dates, descriptions, quantities, rates, taxes,
            payment terms and instructions, amounts paid, status, contact and address
            details, confirmation details, internal notes, and an activity record of
            events such as creation, review, confirmation, attachments, and sending.
          </span>
        </p>
        <p>
          <strong>Files and supporting records.</strong>{" "}
          <span className="text-muted">
            Uploaded logos and invoice supporting documents are stored with the service.
            Supporting documents can include PDFs, images, and CSV files and may contain
            whatever information the person uploading them chose to include.
          </span>
        </p>
        <p>
          <strong>Invoices made without an account.</strong>{" "}
          <span className="text-muted">
            You can create an invoice at{" "}
            <Link className="text-ink underline" href="/create">
              /create
            </Link>{" "}
            without signing in. The invoice and the client and contractor records needed
            for it are still stored. A person with its private view link can open it, so
            treat that link like a key.
          </span>
        </p>
        <p>
          <strong>Email records.</strong>{" "}
          <span className="text-muted">
            We keep an outbox record of email the service prepares or sends. That record
            can include To, CC, and BCC addresses, the subject, message body, and a service
            link. When delivery is enabled, the email provider also receives the message
            and any attachments so it can deliver them.
          </span>
        </p>
        <p>
          <strong>Authentication and technical information.</strong>{" "}
          <span className="text-muted">
            Session records contain a hashed token and expiry. Passwordless-link records
            contain a hashed token, purpose, email address, expiry, and use status. Our
            hosting provider also receives ordinary request information needed to serve
            the site, such as IP address, request headers, requested path, and time of
            request.
          </span>
        </p>
      </LegalSection>

      <LegalSection heading="How we use information">
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>Create and protect accounts and sign-in sessions.</li>
          <li>Create, store, display, download, import, review, confirm, and send invoices.</li>
          <li>Generate PDFs and keep invoice activity and email records.</li>
          <li>Provide workspaces, plans, administrative tools, support, and security.</li>
          <li>Comply with law and enforce the Terms of Service.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Cookies and browser storage">
        <p className="text-muted">
          Uncle Invoice uses essential cookies for sign-in, Google sign-in, and a limited
          administrator preview tool. It also uses local browser storage to remember when
          a signed-in user dismisses one plan offer. None of these is used for advertising
          or analytics. Our{" "}
          <Link className="text-ink underline" href="/cookies">
            Cookie Notice
          </Link>{" "}
          gives the names, purposes, and lifetimes of these items.
        </p>
      </LegalSection>

      <LegalSection heading="Passwordless links are keys">
        <p className="text-muted">
          Some links open an account, invoice, or supporting document without a password.
          Sign-in links normally expire after 2 hours, password-reset links after 1 hour,
          single-invoice review links after 7 days, contractor invoice links after 30
          days, and invoice view links after 1 year. Some links also stop working after
          use. Anyone who receives a still-valid link may be able to take the action it
          allows, so do not forward it to someone who should not have that access.
        </p>
      </LegalSection>

      <LegalSection heading="When information is shared">
        <p className="text-muted">
          Information is shared with the people and addresses selected through the
          service. For example, a contractor may see an invoice and its supporting
          documents, and a client may receive an invoice by email. Workspace members can
          see records in that workspace. A person with a valid private link can see what
          that link opens.
        </p>
        <p className="text-muted">
          We also use service providers to operate Uncle Invoice:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>
            <strong className="text-ink">Netlify</strong> hosts the application and serves
            requests.
          </li>
          <li>
            <strong className="text-ink">Supabase</strong> hosts the production database.
          </li>
          <li>
            <strong className="text-ink">Resend</strong> receives outgoing messages,
            recipients, and attachments when email delivery is enabled.
          </li>
          <li>
            <strong className="text-ink">Google</strong> receives and returns information
            needed for Google sign-in if you choose it.
          </li>
          <li>
            <strong className="text-ink">Cloudflare</strong> provides DNS for the domain.
          </li>
        </ul>
        <p className="text-muted">
          Some public pages include YouTube video embeds or images hosted by third parties.
          Loading them sends a request to that provider, which handles it under its own
          privacy terms. We may also disclose information when required by law, to protect
          the service or its users, or as part of a business transfer subject to applicable
          safeguards.
        </p>
      </LegalSection>

      <LegalSection heading="How long we keep information">
        <p className="text-muted">
          The application does not automatically erase account, invoice, outbox, or
          activity records on a fixed schedule. We generally keep them while they are
          needed to provide the service, maintain the business record, resolve disputes,
          or meet legal obligations. An expired link stops authorizing access, but its
          database record may remain. You can ask us to delete personal information; we
          will respond under applicable law and explain if something must be retained.
        </p>
      </LegalSection>

      <LegalSection heading="Your choices and requests">
        <p className="text-muted">
          Signed-in users can update profile and business details and can edit many client,
          contractor, and invoice fields. Some supporting documents can be removed in the
          product. For access, correction, export, account closure, or deletion requests,
          email{" "}
          <a className="text-ink underline" href="mailto:notices@uncleinvoice.com">
            notices@uncleinvoice.com
          </a>
          . We may need to verify the request and your authority over information that
          concerns another person or business.
        </p>
      </LegalSection>

      <LegalSection heading="Security">
        <p className="text-muted">
          Passwords are stored as bcrypt hashes, private link and session tokens are stored
          as hashes in the database, and authentication cookies are HttpOnly and Secure in
          production. These controls reduce risk but do not make any online service immune
          from loss, misuse, or unauthorized access.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p className="text-muted">
          Uncle Invoice is a business invoicing service and is not directed to children
          under 13. If you believe a child under 13 provided personal information, contact
          us so we can review and remove it as required.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p className="text-muted">
          We will change the date above when this policy changes. If a change materially
          affects how we use personal information, we will provide notice appropriate to
          the change, such as a notice in the service or an email to account holders.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
