import Link from "next/link";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { ContractorForm } from "@/components/contractor-form";
import { ContractorLinkButton } from "@/components/contractor-link-button";

export default async function ContractorsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  await requireWorkspace(workspaceId);
  const contractors = await db.contractor.findMany({
    where: { workspaceId },
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  });
  const contractorIds = contractors.map((contractor) => contractor.id);
  const [needsReview, readyToSend, alreadySent, paidAwaiting] = contractorIds.length
    ? await Promise.all([
        db.invoice.groupBy({
          by: ["contractorId"],
          where: { workspaceId, contractorId: { in: contractorIds }, confirmedAt: null },
          _count: true,
        }),
        db.invoice.groupBy({
          by: ["contractorId"],
          where: { workspaceId, contractorId: { in: contractorIds }, confirmedAt: { not: null }, sentAt: null },
          _count: true,
        }),
        db.invoice.groupBy({
          by: ["contractorId"],
          where: { workspaceId, contractorId: { in: contractorIds }, sentAt: { not: null } },
          _count: true,
        }),
        db.invoice.groupBy({
          by: ["contractorId"],
          where: { workspaceId, contractorId: { in: contractorIds }, confirmedAt: null, amountPaid: { gt: 0 } },
          _count: true,
        }),
      ])
    : [[], [], [], []];

  const countMap = (rows: { contractorId: string; _count: number }[]) =>
    Object.fromEntries(rows.map((row) => [row.contractorId, row._count]));
  const reviewCounts = countMap(needsReview);
  const readyCounts = countMap(readyToSend);
  const sentCounts = countMap(alreadySent);
  const paidCounts = countMap(paidAwaiting);
  const totalReview = Object.values(reviewCounts).reduce((sum, n) => sum + n, 0);
  const totalReady = Object.values(readyCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm" aria-label="Client paperwork summary">
        <span><strong className="tabular-nums">{contractors.length}</strong> {contractors.length === 1 ? "contractor" : "contractors"}</span>
        <span className="text-muted"><strong className="tabular-nums text-ink">{totalReview}</strong> drafts</span>
        <span className="text-muted"><strong className="tabular-nums text-ink">{totalReady}</strong> saved, not sent</span>
      </section>

      <details className="paper rounded-2xl">
        <summary className="min-h-12 cursor-pointer px-4 py-3 font-medium">Add a contractor</summary>
        <div className="border-t border-line p-4 sm:p-5">
          <ContractorForm workspaceId={workspaceId} />
        </div>
      </details>

      <section className="overflow-hidden rounded-2xl border border-line bg-paper" aria-labelledby="contractor-work-heading">
        <div className="border-b border-line px-4 py-3 sm:px-5">
          <h2 id="contractor-work-heading" className="font-semibold">Contractor paperwork</h2>
        </div>
        {contractors.length ? (
          <ul className="divide-y divide-line">
            {contractors.map((contractor) => {
              const review = reviewCounts[contractor.id] ?? 0;
              const ready = readyCounts[contractor.id] ?? 0;
              const sent = sentCounts[contractor.id] ?? 0;
              const paid = paidCounts[contractor.id] ?? 0;
              const href = `/app/w/${workspaceId}/invoices?contractor=${encodeURIComponent(contractor.id)}`;
              const next = review > 0
                ? <Link href={`${href}&status=draft`} className="btn btn-primary min-h-11 w-full sm:w-auto">Review {review} {review === 1 ? "draft" : "drafts"}</Link>
                : ready > 0
                  ? <Link href={`${href}&status=saved`} className="btn btn-secondary min-h-11 w-full sm:w-auto">Select {ready} saved PDFs</Link>
                  : <Link href={href} className="btn btn-ghost min-h-11 w-full sm:w-auto">View invoices</Link>;

              return (
                <li key={contractor.id} className="p-4 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium">{contractor.name}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {contractor._count.invoices} invoices <span aria-hidden>·</span> {review} drafts <span aria-hidden>·</span> {ready} saved <span aria-hidden>·</span> {sent} sent
                      </p>
                      {paid > 0 ? <p className="mt-1 text-xs text-muted">{paid} already-paid payments still need confirmed paperwork</p> : null}
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                      {next}
                      {contractor._count.invoices > 0 ? (
                        <ContractorLinkButton workspaceId={workspaceId} contractorId={contractor.id} contractorName={contractor.name} />
                      ) : null}
                    </div>
                  </div>
                  <details className="mt-2 text-sm">
                    <summary className="min-h-10 cursor-pointer py-2 text-muted">Contact details</summary>
                    <p className="pb-1 text-muted">
                      {contractor.email ?? "No email"}{contractor.phone ? ` · ${contractor.phone}` : ""}
                    </p>
                  </details>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-8 text-muted">No contractors yet. Add one when you are ready.</p>
        )}
      </section>

      <p className="text-sm text-muted">
        Contractors can review and correct draft invoices through their private link. A payment can already be recorded while an invoice is still a draft.
      </p>
    </div>
  );
}
