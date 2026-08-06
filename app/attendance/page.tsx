import PageHeader from "@/components/PageHeader";
import CrmShell from "@/components/layout/CrmShell";
import AttendanceTabContent from "./AttendanceTabContent";

export default function AttendancePage() {
  return (
    <CrmShell activeNav="Attendance">
      <div className="space-y-5 p-4 md:p-6">
        <PageHeader
          title="Attendance"
          subtitle="Manage employee attendance, self-marking, and daily attendance records."
        />
        <AttendanceTabContent />
      </div>
    </CrmShell>
  );
}
