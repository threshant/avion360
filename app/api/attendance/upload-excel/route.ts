import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

// Normalise a cell value to string, trimmed
function cell(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

// Parse numeric cell — "-" or empty becomes 0
function num(v: unknown): number {
  const s = cell(v);
  if (!s || s === "-") return 0;
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

// Fuzzy-normalise a column header for matching
function normalise(s: string): string {
  return s.toLowerCase().replace(/[\s_\-().]/g, "");
}

// Match a normalised header to known keys
function headerKey(h: string): string | null {
  const n = normalise(h);
  if (["employeename", "name", "staffname", "employee"].includes(n))
    return "name";
  if (n === "present" || n === "presentdays") return "present";
  if (n === "absent" || n === "absentdays") return "absent";
  if (n === "halfday" || n === "halfdays") return "halfDay";
  if (n === "leaves" || n === "leavedays" || n === "leave") return "leaves";
  if (n === "holiday" || n === "holidays") return "holiday";
  if (n === "weeklyoff" || n === "weekoff") return "weeklyOff";
  if (n === "notmarked" || n === "nm") return "notMarked";
  if (n === "overtime" || n === "overtimedays") return "overtime";
  if (n === "lop" || n === "lopdays" || n === "lossofpay") return "lop";
  return null;
}

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const monthParam = formData.get("month") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (!monthParam || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)) {
      return NextResponse.json(
        { error: "month param required (YYYY-MM)" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
    }) as unknown[][];

    if (rawRows.length < 2) {
      return NextResponse.json(
        { error: "Excel file has no data rows" },
        { status: 400 },
      );
    }

    // Find the header row — first row where at least one cell matches a known key
    let headerRowIdx = -1;
    let colMap: Record<string, number> = {};

    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      const row = rawRows[i];
      const tryMap: Record<string, number> = {};
      let hits = 0;
      row.forEach((cellVal, colIdx) => {
        const k = headerKey(cell(cellVal));
        if (k) {
          tryMap[k] = colIdx;
          hits++;
        }
      });
      if (hits >= 2) {
        headerRowIdx = i;
        colMap = tryMap;
        break;
      }
    }

    if (headerRowIdx === -1 || !colMap["name"]) {
      return NextResponse.json(
        { error: "Could not find header row with Employee Name column" },
        { status: 400 },
      );
    }

    // Parse data rows
    type RowData = {
      name: string;
      present: number;
      absent: number;
      halfDay: number;
      leaves: number;
      holiday: number;
      weeklyOff: number;
      notMarked: number;
      overtime: number;
      lop: number;
    };

    const dataRows: RowData[] = [];
    for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      const name = cell(row[colMap["name"] ?? 0]);
      if (!name) continue;
      dataRows.push({
        name,
        present: num(colMap["present"] != null ? row[colMap["present"]] : null),
        absent: num(colMap["absent"] != null ? row[colMap["absent"]] : null),
        halfDay: num(colMap["halfDay"] != null ? row[colMap["halfDay"]] : null),
        leaves: num(colMap["leaves"] != null ? row[colMap["leaves"]] : null),
        holiday: num(colMap["holiday"] != null ? row[colMap["holiday"]] : null),
        weeklyOff: num(
          colMap["weeklyOff"] != null ? row[colMap["weeklyOff"]] : null,
        ),
        notMarked: num(
          colMap["notMarked"] != null ? row[colMap["notMarked"]] : null,
        ),
        overtime: num(
          colMap["overtime"] != null ? row[colMap["overtime"]] : null,
        ),
        // if explicit LOP column exists use it; otherwise treat absent as LOP
        lop: num(
          colMap["lop"] != null
            ? row[colMap["lop"]]
            : colMap["absent"] != null
              ? row[colMap["absent"]]
              : null,
        ),
      });
    }

    if (dataRows.length === 0) {
      return NextResponse.json(
        { error: "No employee rows found in file" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Fetch all users to match by name (case-insensitive)
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, name")
      .eq("is_active", true)
      .eq("tenant_id", tenantId);

    if (usersError) throw usersError;

    const usersByName = new Map<string, string>(); // normalised name → user_id
    (users || []).forEach((u) => {
      usersByName.set(u.name.trim().toLowerCase(), u.id);
    });

    const matched: Array<{ userId: string; row: RowData }> = [];
    const unmatched: string[] = [];

    for (const row of dataRows) {
      const uid = usersByName.get(row.name.toLowerCase());
      if (uid) {
        matched.push({ userId: uid, row });
      } else {
        // Try partial match
        let found: string | undefined;
        for (const [key, id] of usersByName.entries()) {
          if (
            key.includes(row.name.toLowerCase()) ||
            row.name.toLowerCase().includes(key)
          ) {
            found = id;
            break;
          }
        }
        if (found) {
          matched.push({ userId: found, row });
        } else {
          unmatched.push(row.name);
        }
      }
    }

    if (matched.length === 0) {
      return NextResponse.json(
        {
          error:
            "No employees matched. Check employee names match user profiles.",
          unmatched,
        },
        { status: 422 },
      );
    }

    // Upsert attendance_monthly_summary
    const summaries = matched.map(({ userId, row }) => ({
      user_id: userId,
      month: monthParam,
      present_days: row.present,
      absent_days: row.absent,
      half_days: row.halfDay,
      leave_days: row.leaves,
      holiday_days: row.holiday,
      weekly_off: row.weeklyOff,
      not_marked: row.notMarked,
      overtime_days: row.overtime,
      lop_days: row.lop,
      source: "excel_upload",
      updated_at: new Date().toISOString(),
      tenant_id: tenantId,
    }));

    const { error: summaryError } = await supabase
      .from("attendance_monthly_summary")
      .upsert(summaries, { onConflict: "user_id,month" });

    if (summaryError) throw summaryError;

    // Also update payroll_records LOP deduction if records exist for this month
    for (const { userId, row } of matched) {
      const { data: userRow } = await supabase
        .from("users")
        .select("salary_amount")
        .eq("id", userId)
        .eq("tenant_id", tenantId)
        .single();

      if (!userRow) continue;
      const ctc = Number(userRow.salary_amount || 0);
      const dailyRate = ctc / 26;
      const lopDeduction = Math.round(row.lop * dailyRate * 100) / 100;

      await supabase
        .from("payroll_records")
        .update({
          lop_days: row.lop,
          lop_deduction: lopDeduction,
          deductions: 208 + lopDeduction,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .eq("month", monthParam);
    }

    return NextResponse.json({
      processed: matched.length,
      unmatched,
      month: monthParam,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[POST /api/attendance/upload-excel]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
