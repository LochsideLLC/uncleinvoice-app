import { notFound } from "next/navigation";
import { localDevAccessEnabled, DEV_ACCOUNT_EMAIL } from "@/lib/dev-access";

export default function DevAccessPage() {
  if (!localDevAccessEnabled()) notFound();

  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <div className="paper space-y-5 rounded-3xl p-6">
        <h1 className="text-3xl">Demo bookkeeper access</h1>
        <p>This preview uses local sample data. Sign in as {DEV_ACCOUNT_EMAIL} to review bookkeeper mode.</p>
        <form action="/dev-access/sign-in" method="post">
          <button className="btn btn-primary w-full" type="submit">Open demo workspace</button>
        </form>
      </div>
    </main>
  );
}
