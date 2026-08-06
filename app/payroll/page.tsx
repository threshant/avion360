import PayrollTabContent from "@/app/attendance/PayrollTabContent";
import PageHeader from "@/components/PageHeader";
import CrmShell from "@/components/layout/CrmShell";

export default function PayrollPage() {
  return (
    <CrmShell activeNav="Payroll">
      <div className="space-y-5 p-4 md:p-6">
        <PageHeader
          title="Payroll"
          subtitle="Review payroll summaries, upload attendance data, and manage payslips."
        />
        <PayrollTabContent />
      </div>
    </CrmShell>
  );
}
