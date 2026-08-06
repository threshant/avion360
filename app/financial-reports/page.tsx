import { redirect } from "next/navigation";

export default function FinancialReportsPage() {
  redirect("/reports?tab=financial");
}
