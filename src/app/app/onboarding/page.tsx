import Link from "next/link";
import { updateAccountTypeAction } from "@/actions/account";

export const metadata = { title: "A little about you — Uncle Invoice" };

export default function OnboardingPage() {
  return (
    <section className="mx-auto max-w-xl space-y-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Welcome to Uncle Invoice</p>
      <h1 className="display text-3xl">What brings you here?</h1>
      <p className="text-muted">This helps us point you to the right tools. You can change your answer later.</p>
      <form action={updateAccountTypeAction} className="paper space-y-5 rounded-3xl p-6">
        <div className="field">
          <label htmlFor="accountType">I am a…</label>
          <select id="accountType" name="accountType" defaultValue="" required>
            <option value="" disabled>Choose one</option>
            <option value="contractor">Contractor</option>
            <option value="bookkeeper">Bookkeeper</option>
            <option value="other">Other</option>
          </select>
        </div>
        <button className="btn btn-primary" type="submit">Continue</button>
      </form>
      <p className="text-sm text-muted">Want the overview first? <Link href="/how-it-works" className="underline">How it works</Link>.</p>
    </section>
  );
}
