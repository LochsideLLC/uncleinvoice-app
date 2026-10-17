import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Cookie Notice — Uncle Invoice",
  description:
    "The essential cookies and browser storage Uncle Invoice uses, and its current no-tracking policy.",
};

export default function CookieNoticePage() {
  return (
    <LegalPage
      title="Cookie Notice"
      updated="October 17, 2026"
      intro="Uncle Invoice does not currently use cookies to track you. This notice lists the small amount of browser storage the service does use."
    >
      <LegalSection heading="No tracking cookies today">
        <p className="text-muted">
          We do not currently use advertising cookies, analytics cookies, tracking pixels,
          or similar tools to measure your behavior across this site or other sites. We may
          add optional analytics or similar tools in the future. If that changes, we will
          update this notice and provide a real way to opt out before using non-essential
          tracking for people who decline it. We will not treat a notice-only banner or
          continued browsing as an opt-out.
        </p>
      </LegalSection>

      <LegalSection heading="Essential cookies we use">
        <ul className="list-disc space-y-3 pl-5 text-muted">
          <li>
            <code className="text-ink">ir_session</code> keeps a signed-in account linked
            to its server-side session. It lasts for up to 30 days and is removed from the
            browser when the user signs out.
          </li>
          <li>
            <code className="text-ink">ir_google_oauth</code> temporarily keeps the state
            needed to complete Google sign-in safely. It lasts for up to 10 minutes and is
            removed when the callback is handled.
          </li>
          <li>
            <code className="text-ink">ir_view_as</code> supports the administrator-only
            account preview tool. It lasts for up to 1 hour and is removed when the preview
            ends.
          </li>
        </ul>
        <p className="text-muted">
          These cookies are HttpOnly and SameSite=Lax, and they are marked Secure in
          production. They are used for authentication or an administrator security tool,
          not advertising or analytics.
        </p>
      </LegalSection>

      <LegalSection heading="Local browser storage">
        <p className="text-muted">
          After a signed-in user completes useful work, Uncle Invoice may show one plan
          offer. If the user dismisses it, the browser stores a dismissal value keyed to
          the account&rsquo;s internal identifier and current plan. This value stays in that
          browser until its storage is cleared. It is not used to follow the user across
          sites and is not sent to an advertising or analytics service.
        </p>
      </LegalSection>

      <LegalSection heading="Third-party content and sign-in">
        <p className="text-muted">
          Choosing Google sign-in sends you to Google, which may use its own cookies under
          its policies. Some public pages also load YouTube embeds or third-party images.
          Those requests go to the third party, and that provider may use cookies or other
          technologies under its own terms. Uncle Invoice does not receive advertising or
          analytics reports from those embeds.
        </p>
      </LegalSection>

      <LegalSection heading="Your browser controls">
        <p className="text-muted">
          You can block or delete cookies and local storage through your browser. Blocking
          the essential cookies can prevent sign-in, Google sign-in, or administrator
          preview from working. Because Uncle Invoice does not currently set optional
          tracking cookies, there is no advertising or analytics preference to save today.
        </p>
      </LegalSection>

      <LegalSection heading="Contact and related policy">
        <p className="text-muted">
          Questions about this notice can be sent to{" "}
          <a className="text-ink underline" href="mailto:notices@uncleinvoice.com">
            notices@uncleinvoice.com
          </a>
          . See the{" "}
          <Link className="text-ink underline" href="/privacy">
            Privacy Policy
          </Link>{" "}
          for more about how Lochside LLC handles information.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
