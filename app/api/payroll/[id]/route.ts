import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createNotification } from "@/lib/notifications";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

function getMonthBounds(month: string) {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function statusToWorkingDay(status: string): number {
  if (status === "Present" || status === "Late") return 1;
  if (status === "Half Day") return 0.5;
  return 0;
}

async function computeWorkingDaysForUserMonth(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  tenantId: string,
  userId: string,
  month: string,
) {
  const { startDate, endDate } = getMonthBounds(month);
  const { data, error } = await supabase
    .from("attendance_records")
    .select("status")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) throw error;

  const total = (data || []).reduce(
    (sum: number, row: any) => sum + statusToWorkingDay(row.status),
    0,
  );

  return Number(total.toFixed(1));
}

function mapRow(row: any, workingDays: number) {
  const base = Number(row.base_salary || 0);
  const overtime = Number(row.overtime || 0);
  const bonus = Number(row.bonus || 0);
  const allowances = Number(row.allowances || 0);
  const deductions = Number(row.deductions || 0);
  return {
    id: row.id,
    employeeId: row.user_id,
    name: row.user?.name || "Unknown",
    department: row.user?.department || "-",
    designation: row.user?.designation || "-",
    workingDays,
    month: row.month,
    baseSalary: base,
    overtime,
    bonus,
    allowances: allowances + overtime + bonus,
    deductions,
    netSalary: base + overtime + bonus + allowances - deductions,
    paymentStatus: row.payment_status,
    paidAt: row.paid_at,
    paymentMethod: row.payment_method || undefined,
    remarks: row.remarks || undefined,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("payroll_records")
      .select(
        "id, user_id, month, base_salary, overtime, bonus, allowances, deductions, payment_status, paid_at, payment_method, remarks, user:users!payroll_records_user_id_fkey(id, name, department, designation)",
      )
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (error) throw error;

    const workingDays = await computeWorkingDaysForUserMonth(
      supabase,
      tenantId,
      data.user_id,
      data.month,
    );

    return NextResponse.json(mapRow(data, workingDays));
  } catch (error) {
    console.error("Failed to fetch payroll record:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll record" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const body = await request.json();
    const supabase = createServerSupabaseClient();

    const patch: Record<string, unknown> = {};
    if (body.paymentStatus !== undefined)
      patch.payment_status = body.paymentStatus;
    if (body.paidAt !== undefined) patch.paid_at = body.paidAt;
    if (body.paymentMethod !== undefined)
      patch.payment_method = body.paymentMethod;
    if (body.remarks !== undefined)
      patch.remarks = String(body.remarks || "").trim() || null;

    const { data, error } = await supabase
      .from("payroll_records")
      .update(patch)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select(
        "id, user_id, month, base_salary, overtime, bonus, allowances, deductions, payment_status, paid_at, payment_method, remarks, user:users!payroll_records_user_id_fkey(id, name, department, designation)",
      )
      .single();

    if (error) throw error;

    if (data?.user_id && body.paymentStatus !== undefined) {
      await createNotification(supabase, {
        userId: data.user_id,
        tenantId,
        title: "Payroll Status Updated",
        message: `Your payroll status for ${data.month} is now ${data.payment_status}.`,
        category: "payroll",
        eventType: "payroll_status_updated",
        entityType: "payroll",
        entityId: String(data.id),
        actorUserId: requesterId,
        metadata: {
          payrollId: data.id,
          month: data.month,
          paymentStatus: data.payment_status,
        },
      });
    }

    const workingDays = await computeWorkingDaysForUserMonth(
      supabase,
      tenantId,
      data.user_id,
      data.month,
    );

    return NextResponse.json(mapRow(data, workingDays));
  } catch (error) {
    console.error("Failed to update payroll record:", error);
    return NextResponse.json(
      { error: "Failed to update payroll record" },
      { status: 500 },
    );
  }
}
