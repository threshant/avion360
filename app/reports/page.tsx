"use client";

import CrmShell from "@/components/layout/CrmShell";
import BusinessReportsPanel from "@/components/reports/BusinessReportsPanel";
import FinancialReportsPanel from "@/components/reports/FinancialReportsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";

function getInitialTab(tabParam: string | null): "business" | "financial" {
  return tabParam === "financial" ? "financial" : "business";
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const defaultTab = getInitialTab(searchParams.get("tab"));

  return (
    <CrmShell activeNav="Reports">
      <div className="space-y-5 p-4 md:p-6">
        <section className="rounded-3xl border border-sky-100/90 bg-white/85 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Reports Center</h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage business analytics and financial reporting in one place.
          </p>
        </section>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList>
            <TabsTrigger value="business">Business Reports</TabsTrigger>
            <TabsTrigger value="financial">Financial Reports</TabsTrigger>
          </TabsList>

          <TabsContent
            value="business"
            className="mt-4 border-0 bg-transparent p-0 shadow-none"
          >
            <BusinessReportsPanel />
          </TabsContent>

          <TabsContent
            value="financial"
            className="mt-4 border-0 bg-transparent p-0 shadow-none"
          >
            <FinancialReportsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </CrmShell>
  );
}
