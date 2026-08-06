import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { parsePagination } from "@/lib/pagination";
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

function mapPayrollRow(row: any, workingDays: number) {
  const ctc = Number(row.base_salary || 0);
  const basicSalary =
    Number(row.basic_salary || 0) || Math.round(ctc * 0.6 * 100) / 100;
  const hra = Number(row.hra || 0) || Math.round(ctc * 0.4 * 100) / 100;
  const otherAllowances = Number(row.other_allowances || 0);
  const professionalTax = Number(row.professional_tax ?? 208);
  const lopDays = Number(row.lop_days || 0);
  const lopDeduction = Number(row.lop_deduction || 0);
  const otherDeductions = Number(row.other_deductions || 0);
  const totalEarnings =
    basicSalary +
    hra +
    otherAllowances +
    Number(row.overtime || 0) +
    Number(row.bonus || 0);
  const totalDeductions = professionalTax + lopDeduction + otherDeductions;
  const netSalary = totalEarnings - totalDeductions;

  return {
    id: row.id,
    employeeId: row.user_id,
    employeeCode: row.user?.employee_code || null,
    name: row.user?.name || "Unknown",
    department: row.user?.department || "-",
    designation: row.user?.designation || "-",
    dateOfBirth: row.user?.date_of_birth || null,
    joiningDate: row.user?.joining_date || null,
    workingDays,
    month: row.month,
    // CTC / gross
    baseSalary: ctc,
    basicSalary,
    hra,
    otherAllowances,
    overtime: Number(row.overtime || 0),
    bonus: Number(row.bonus || 0),
    totalEarnings,
    // Deductions
    professionalTax,
    lopDays,
    lopDeduction,
    otherDeductions,
    deductions: Number(row.deductions || 0),
    totalDeductions,
    // Net
    netSalary,
    paymentStatus: row.payment_status,
    paidAt: row.paid_at,
    paymentMethod: row.payment_method || undefined,
    remarks: row.remarks || undefined,
  };
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

    const supabase = createServerSupabaseClient();
    const { searchParams } = request.nextUrl;
    const { page, pageSize, from, to } = parsePagination(searchParams, {
      defaultPageSize: 50,
      maxPageSize: 500,
    });

    const month =
      searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const paymentStatus = searchParams.get("paymentStatus");
    const department = searchParams.get("department");
    const search = searchParams.get("search");

    let query = supabase
      .from("payroll_records")
      .select(
        `id, user_id, month, base_salary, basic_salary, hra, other_allowances,
         overtime, bonus, allowances, professional_tax, lop_days, lop_deduction,
         other_deductions, deductions, payment_status, paid_at, payment_method, remarks,
         user:users!payroll_records_user_id_fkey(id, name, department, designation, email, employee_code, date_of_birth, joining_date)`,
        { count: "exact" },
      )
      .eq("tenant_id", tenantId)
      .eq("month", month)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (paymentStatus) query = query.eq("payment_status", paymentStatus);

    if (department || search) {
      let usersQuery = supabase
        .from("users")
        .select("id")
        .eq("tenant_id", tenantId);
      if (department) usersQuery = usersQuery.eq("department", department);
      if (search) {
        usersQuery = usersQuery.or(
          `name.ilike.%${search}%,email.ilike.%${search}%,designation.ilike.%${search}%,department.ilike.%${search}%`,
        );
      }

      const { data: matchingUsers, error: usersError } = await usersQuery;
      if (usersError) throw usersError;

      const userIds = (matchingUsers || []).map((u) => u.id);
      if (userIds.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, pageSize });
      }

      query = query.in("user_id", userIds);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const userIds = Array.from(new Set(rows.map((row: any) => row.user_id)));
    const workingDaysByUser = new Map<string, number>();

    if (userIds.length > 0) {
      const { startDate, endDate } = getMonthBounds(month);
      const { data: attendanceRows, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("user_id, status")
        .in("user_id", userIds)
        .eq("tenant_id", tenantId)
        .gte("date", startDate)
        .lte("date", endDate);

      if (attendanceError) throw attendanceError;

      (attendanceRows || []).forEach((attendance: any) => {
        const current = workingDaysByUser.get(attendance.user_id) || 0;
        workingDaysByUser.set(
          attendance.user_id,
          Number((current + statusToWorkingDay(attendance.status)).toFixed(1)),
        );
      });
    }

    return NextResponse.json({
      data: rows.map((row: any) =>
        mapPayrollRow(row, workingDaysByUser.get(row.user_id) || 0),
      ),
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Failed to fetch payroll:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll" },
      { status: 500 },
    );
  }
}
