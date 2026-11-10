import { requireUser } from "@/lib/auth";
import { BusinessForm } from "@/components/business-form";
import { PasswordForm } from "@/components/password-form";
import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { WORKSPACE_LABEL, asWorkspaceKind } from "@/lib/workspace-kind";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await requireUser();
  const { returnTo: rawReturnTo } = await searchParams;
  const returnTo = safeInvoiceReturnTo(rawReturnTo);

  return (
    <div className="space-y-6">
      {returnTo ? (
        <Link href={returnTo} className="inline-block text-sm font-semibold text-muted underline underline-offset-2">
          ← Back to invoice
        </Link>
      ) : null}
      <div>
        <p className="text-sm uppercase tracking-widest text-muted">Account</p>
        <h1 className="mt-1 text-3xl">Profile</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ProfileForm
          name={user.name}
          email={user.email}
          backupEmail={user.backupEmail}
          clientTerm={user.clientTerm}
          emailSignature={user.emailSignature}
          emailSignatureType={user.emailSignatureType}
          emailSignatureImage={user.emailSignatureImage}
          defaultInvoiceMessage={user.defaultInvoiceMessage}
        />
        <div id="business-profile" className="scroll-mt-8">
          <BusinessForm
            businessName={user.businessName}
            businessEmail={user.businessEmail}
            businessLogoUrl={user.businessLogoUrl}
            businessWordmarkUrl={user.businessWordmarkUrl}
            businessLogoKind={user.businessLogoKind}
            phone={user.phone}
            addressLine={user.addressLine}
            addressLine2={user.addressLine2}
            city={user.city}
            region={user.region}
            postalCode={user.postalCode}
          />
        </div>
        <PasswordForm hasPassword={Boolean(user.passwordHash)} />
      </div>

      <section id="upgrade" className="paper scroll-mt-8 space-y-4 rounded-3xl p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Workspace</p>
          <h2 className="mt-1 text-xl">{WORKSPACE_LABEL[asWorkspaceKind(user.workspaceKind)]} · Free</h2>
          <p className="mt-2 text-sm text-muted">
            One account, two free workspaces. Switch between Contractor and Bookkeeper anytime — your invoices stay where they are.
          </p>
        </div>
        <Link href="/app/plans" className="btn btn-secondary">Compare workspaces</Link>
      </section>
      <form action={logoutAction}><button type="submit" className="btn btn-ghost">Sign out</button></form>
    </div>
  );
}

function safeInvoiceReturnTo(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value, "http://uncleinvoice.local");
    if (url.origin !== "http://uncleinvoice.local" || !url.pathname.startsWith("/invoices/view/")) {
      return null;
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}
