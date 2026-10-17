import { requireUser } from "@/lib/auth";
import { BusinessForm } from "@/components/business-form";
import { PasswordForm } from "@/components/password-form";
import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { PLAN_LABEL, asPlan } from "@/lib/plan";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-widest text-muted">Account</p>
        <h1 className="mt-1 text-3xl">Profile</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ProfileForm name={user.name} email={user.email} backupEmail={user.backupEmail} clientTerm={user.clientTerm} emailSignature={user.emailSignature} />
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
        <PasswordForm hasPassword={Boolean(user.passwordHash)} />
      </div>

      <section id="upgrade" className="paper scroll-mt-8 space-y-4 rounded-3xl p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Plan</p>
          <h2 className="mt-1 text-xl">{PLAN_LABEL[asPlan(user.plan)]}</h2>
          <p className="mt-2 text-sm text-muted">
            All plans let you save billing customers, write invoices, and track what is paid.
          </p>
        </div>
        <Link href="/app/plans" className="btn btn-secondary">{asPlan(user.plan) === "bookkeeper" ? "View your plan" : "Explore plans"}</Link>
      </section>
      <form action={logoutAction}><button type="submit" className="btn btn-ghost">Sign out</button></form>
    </div>
  );
}
