import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { ContractorForm } from "@/components/contractor-form";
import { ContractorLinkButton } from "@/components/contractor-link-button";
import { canUseContractorLinks } from "@/lib/plan";
import { UpgradeOffer } from "@/components/upgrade-offer";

export default async function ContractorsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { user } = await requireWorkspace(workspaceId);
  const contractors = await db.contractor.findMany({
    where: { workspaceId },
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <ContractorForm workspaceId={workspaceId} />
      <div className="paper rounded-3xl">
        <div className="border-b border-line px-6 py-4">
          <h2 className="text-xl">On this client</h2>
        </div>
        <ul>
          {contractors.map((contractor) => (
            <li key={contractor.id} className="border-t border-line px-6 py-4 first:border-t-0">
              <p className="font-medium">{contractor.name}</p>
              <p className="text-sm text-muted">
                {contractor.email ?? "No email"}
                {contractor.phone ? ` · ${contractor.phone}` : ""}
              </p>
              <p className="mt-1 text-sm text-muted">
                {contractor._count.invoices} invoices
              </p>
              {contractor._count.invoices > 0 ? (
                canUseContractorLinks(user.plan) ? <ContractorLinkButton
                  workspaceId={workspaceId}
                  contractorId={contractor.id}
                  contractorName={contractor.name}
                /> : <div className="mt-3"><UpgradeOffer feature="links">Contractor review link · Bookkeeper</UpgradeOffer></div>
              ) : null}
            </li>
          ))}
          {contractors.length === 0 ? (
            <li className="px-6 py-8 text-muted">No contractors yet.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
