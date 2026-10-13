import Link from "next/link";
import { listSponsors } from "@/lib/sponsors";
import { SponsorBoard } from "@/components/sponsor-board";

export default async function HomePage() {
  const { featured, rest } = await listSponsors();

  return (
    <div className="flex min-h-full flex-col">
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center px-6 pb-6 text-center">
          <h1 className="text-4xl leading-[1.12] text-ink sm:text-5xl">
            Create invoices for free
          </h1>
          <p className="mt-4 text-lg text-muted">
            Then send them to your customers and clients.
          </p>
          <Link href="/create" className="btn btn-primary btn-hero mt-10">
            Create Invoice
          </Link>
        </div>
        <SponsorBoard featured={featured} rest={rest} />
      </main>
    </div>
  );
}
