import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FirstPasswordForm } from "@/components/first-password-form";

export const metadata = { title: "Choose a password — Uncle Invoice" };

export default async function SetPasswordPage() {
  const user = await requireUser();
  if (!user.mustSetPassword) redirect("/app");

  return (
    <div className="mx-auto w-full max-w-md px-6 pb-16">
      <h1 className="text-3xl leading-tight">Choose your own password</h1>
      <p className="mt-3 text-muted">
        Your account was set up for you, so the password you were given is temporary and
        someone else knows it. Pick your own and nobody but you can get in.
      </p>
      <FirstPasswordForm />
    </div>
  );
}
