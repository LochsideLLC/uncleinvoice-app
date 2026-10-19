// Synthetic, process-local data only. The test runner replaces every database import.
export const state = { plan: "free", planSetAt: null as Date | null, planUpdates: 0, signedIn: true, creates: 0, paidIds: new Set<string>(), archivedIds: new Set<string>() };
export const user = () => ({ id: "sample-user", email: "owner@example.test", plan: state.plan, workspaceKind: "contractor", name: "Sample owner", admin: false });
export const db = {
  user: {
    findFirst: async ({ where }: { where: { id: { in: string[] }; archivedAt: null; plan: { in: string[] } } }) => {
      if (where.archivedAt !== null || !where.plan.in.includes("invoice")) throw new Error("Missing entitlement restrictions");
      const id = where.id.in.find((id) => state.paidIds.has(id) && !state.archivedIds.has(id));
      return id ? { id } : null;
    },
    updateMany: async ({ where, data }: { where: { id: string; plan?: string }; data: { plan: string; planSetAt: Date } }) => {
      if (where.id !== "sample-user" || (where.plan && where.plan !== state.plan)) return { count: 0 };
      state.plan = data.plan;
      state.planSetAt = data.planSetAt;
      state.planUpdates += 1;
      return { count: 1 };
    },
  },
  workspace: {
    create: async ({ data }: { data: Record<string, unknown> }) => ({ ...data, id: `sample-${++state.creates}`, invoicePrefix: "INV", nextInvoiceNumber: 1 }),
  },
  workspaceMember: {
    findUnique: async () => ({ workspace: { id: "sample-workspace" } }),
  },
};
