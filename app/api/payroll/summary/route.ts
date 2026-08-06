import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

function net(row: any) {
  return (
    Number(row.base_salary || 0) +
    Number(row.overtime || 0) +
    Number(row.bonus || 0) +
    Number(row.allowances || 0) -
    Number(row.deductions || 0)
  );
}

export async function GET(request: NextRequest) {
  try {
    const requesterId = getUserIdFromRequest(request);
    if (!requesterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const month =
      request.nextUrl.searchParams.get("month") ||
      new Date().toISOString().slice(0, 7);

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("payroll_records")
      .select(
        "base_salary, overtime, bonus, allowances, deductions, payment_status",
      )
      .eq("tenant_id", tenantId)
      .eq("month", month);

    if (error) throw error;

    const rows = data || [];
    const totalPayable = rows.reduce((sum, row) => sum + net(row), 0);
    const totalPaid = rows
      .filter((row) => row.payment_status === "Paid")
      .reduce((sum, row) => sum + net(row), 0);

    return NextResponse.json({
      month,
      totalEmployees: rows.length,
      totalPayable,
      totalPaid,
      totalPending: totalPayable - totalPaid,
    });
  } catch (error) {
    console.error("Failed to fetch payroll summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll summary" },
      { status: 500 },
    );
  }
}
