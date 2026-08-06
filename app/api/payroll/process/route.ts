import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createNotificationsBulk } from "@/lib/notifications";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

function normalizeMonth(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const yyyyMm = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (yyyyMm) {
    const year = Number(yyyyMm[1]);
    const month = Number(yyyyMm[2]);
    if (year >= 1900 && month >= 1 && month <= 12) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
    }
  }

  const dateParsed = new Date(trimmed);
  if (!Number.isNaN(dateParsed.getTime())) {
    return `${dateParsed.getUTCFullYear()}-${String(dateParsed.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  return null;
}

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

const PROFESSIONAL_TAX = 208;
const STANDARD_WORKING_DAYS = 26;

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const month =
      normalizeMonth(body?.month) || new Date().toISOString().slice(0, 7);

    const supabase = createServerSupabaseClient();

    // Fetch all active users with their salary
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, salary_amount")
      .eq("is_active", true)
      .eq("tenant_id", tenantId);

    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    // Fetch attendance monthly summaries for this month (from Excel upload)
    const userIds = users.map((u) => u.id);
    const { data: summaries } = await supabase
      .from("attendance_monthly_summary")
      .select("user_id, absent_days, lop_days")
      .in("user_id", userIds)
      .eq("tenant_id", tenantId)
      .eq("month", month);

    // Fallback: compute absent days from attendance_records if no summary
    const { startDate, endDate } = getMonthBounds(month);
    const { data: attendanceRows } = await supabase
      .from("attendance_records")
      .select("user_id, status")
      .in("user_id", userIds)
      .eq("tenant_id", tenantId)
      .gte("date", startDate)
      .lte("date", endDate);

    // Build absent day map: prefer summary, fall back to attendance_records
    const summaryMap = new Map<string, number>();
    (summaries || []).forEach((s) => {
      // lop_days from summary is the authoritative value; absent_days as fallback
      summaryMap.set(
        String(s.user_id),
        Number(s.lop_days ?? s.absent_days ?? 0),
      );
    });

    // attendance_records fallback count
    const absenceFromRecords = new Map<string, number>();
    (attendanceRows || []).forEach((row) => {
      if (row.status === "Absent") {
        const uid = String(row.user_id);
        absenceFromRecords.set(uid, (absenceFromRecords.get(uid) || 0) + 1);
      }
    });

    const records = users.map((user) => {
      const ctc = Number(user.salary_amount || 0);
      const basicSalary = Math.round(ctc * 0.6 * 100) / 100;
      const hra = Math.round(ctc * 0.4 * 100) / 100;
      const otherAllowances = 0;

      const uid = String(user.id);
      const lopDays = summaryMap.has(uid)
        ? summaryMap.get(uid)!
        : absenceFromRecords.get(uid) || 0;

      const dailyRate = ctc / STANDARD_WORKING_DAYS;
      const lopDeduction = Math.round(lopDays * dailyRate * 100) / 100;
      const profTax = ctc > 0 ? PROFESSIONAL_TAX : 0;
      const totalDeductions = profTax + lopDeduction;

      return {
        user_id: user.id,
        month,
        base_salary: ctc,
        basic_salary: basicSalary,
        hra,
        other_allowances: otherAllowances,
        overtime: 0,
        bonus: 0,
        allowances: otherAllowances,
        professional_tax: profTax,
        lop_days: lopDays,
        lop_deduction: lopDeduction,
        other_deductions: 0,
        deductions: totalDeductions,
        payment_status: "Pending",
        tenant_id: tenantId,
      };
    });

    const { error: upsertError } = await supabase
      .from("payroll_records")
      .upsert(records, { onConflict: "user_id,month" });

    if (upsertError) throw upsertError;

    await createNotificationsBulk(
      supabase,
      records.map((record) => ({
        userId: String(record.user_id),
        tenantId,
        title: "Payroll Processed",
        message: `Payroll has been processed for ${month}.`,
        category: "payroll" as const,
        eventType: "payroll_processed",
        entityType: "payroll",
        entityId: `${record.user_id}:${month}`,
        actorUserId: requesterId,
        metadata: { month, baseSalary: record.base_salary },
      })),
    );

    return NextResponse.json({ processed: records.length });
  } catch (error: unknown) {
    console.error("Failed to process payroll:", error);

    const err = error as {
      code?: string;
      message?: string;
      details?: string;
      hint?: string;
    };

    if (
      err?.code === "23514" &&
      (err?.message || "").includes("payroll_records_month_check")
    ) {
      return NextResponse.json(
        {
          error:
            "Payroll month validation failed in database constraint. Apply latest payroll month-check migration.",
          code: err.code,
          details: err.details || null,
          hint: err.hint || null,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: err?.message || "Failed to process payroll",
        code: err?.code || null,
        details: err?.details || null,
        hint: err?.hint || null,
      },
      { status: 500 },
    );
  }
}
