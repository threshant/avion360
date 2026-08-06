import PageHeader from "@/components/PageHeader";
import CrmShell from "@/components/layout/CrmShell";

export default function DealsPage() {
  return (
    <CrmShell activeNav="Opportunities">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title="Deals" subtitle="Monitor opportunities and deal stages." />
      </div>
    </CrmShell>
  );
}
