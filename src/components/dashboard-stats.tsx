import { InvoiceList } from "@/components/invoice-list";
import { DashboardMetrics } from "@/components/dashboard-metrics";
import type { DashboardStats } from "@/lib/dashboard";

export function DashboardStats({ stats, canDownloadBulk }: { stats: DashboardStats; canDownloadBulk: boolean }) {
  return (
    <section className="space-y-8">
      <DashboardMetrics stats={stats} />
      {stats.invoiceCount > 0 && <InvoiceList invoices={stats.allInvoices} canDownloadBulk={canDownloadBulk} />}
    </section>
  );
}
