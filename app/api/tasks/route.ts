import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createNotification } from "@/lib/notifications";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { CreateTaskPayload, Task } from "@/types/task";
import { NextRequest, NextResponse } from "next/server";

const TABLE_NAME = "tasks";

// Map database fields to Task type
function mapToTask(row: any): Task {
  const createdBy = row.created_by ?? null;
  const assignedTo = row.assigned_to ?? null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    priority: row.priority,
    status: row.status,
    assignedTo,
    assignedToName: row.assigned_user?.name ?? null,
    assignedToEmail: row.assigned_user?.email ?? null,
    assignedBy: createdBy,
    assignedByName: row.created_user?.name ?? null,
    assignedByEmail: row.created_user?.email ?? null,
    createdBy,
    createdByName: row.created_user?.name ?? null,
    createdByEmail: row.created_user?.email ?? null,
    selfAssigned: Boolean(createdBy && assignedTo && createdBy === assignedTo),
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    relatedTo: row.related_to,
  };
}

// Helper to check Supabase connection
function checkSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    checkSupabaseConfig();
    const supabase = createServerSupabaseClient();

    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: User not found" },
        { status: 401 },
      );
    }
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    let query = supabase
      .from(TABLE_NAME)
      .select(
        "*, assigned_user:users!tasks_assigned_to_fkey(name, email), created_user:users!tasks_created_by_fkey(name, email)",
        {
          count: "exact",
        },
      )
      .eq("assigned_to", userId)
      .eq("tenant_id", tenantId);

    // Apply filters
    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);
    if (type) query = query.eq("type", type);
    if (search) query = query.ilike("title", `%${search}%`);

    // Pagination
    const offset = (page - 1) * pageSize;
    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const mappedData = (data || []).map(mapToTask);

    return NextResponse.json({
      data: mappedData,
      total: count || 0,
      page,
      pageSize,
    });
  } catch (err: any) {
    const errorMsg = err?.message || err?.toString?.() || "Unknown error";
    console.error("[GET /api/tasks] Error:", {
      message: errorMsg,
      details: err?.details || err?.hint || err?.error_description || "",
      code: err?.code,
    });

    // Provide helpful error messages
    if (errorMsg.includes("ENOTFOUND") || errorMsg.includes("getaddrinfo")) {
      return NextResponse.json(
        {
          error: "Cannot reach Supabase. Please verify:",
          details: [
            "1. Supabase project URL is correct in .env.local",
            "2. Network connection is available",
            "3. Supabase project is active (not suspended)",
            "Check .env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
          ],
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: errorMsg || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    checkSupabaseConfig();
    const supabase = createServerSupabaseClient();
    const payload: CreateTaskPayload = await req.json();

    // Get user ID from auth-token JWT (or fallback user-id cookie)
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: User not found" },
        { status: 401 },
      );
    }
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([
        {
          title: payload.title,
          description: payload.description,
          type: payload.type,
          priority: payload.priority,
          status: payload.status || "Pending",
          assigned_to: payload.assignedTo,
          due_date: payload.dueDate,
          completed_at: payload.completedAt,
          created_by: userId,
          tenant_id: tenantId,
        },
      ])
      .select(
        "*, assigned_user:users!tasks_assigned_to_fkey(name, email), created_user:users!tasks_created_by_fkey(name, email)",
      )
      .single();

    if (error) {
      console.error("[POST /api/tasks] Supabase error:", JSON.stringify(error));
      throw error;
    }

    if (payload.assignedTo && payload.assignedTo !== userId) {
      await createNotification(supabase, {
        userId: payload.assignedTo,
        tenantId,
        title: "New Task Assigned",
        message: `A task has been assigned to you: ${payload.title}`,
        category: "task",
        eventType: "task_assigned",
        entityType: "task",
        entityId: String(data.id),
        actorUserId: userId,
        metadata: {
          taskId: data.id,
          taskTitle: payload.title,
          dueDate: payload.dueDate,
        },
      });
    }

    return NextResponse.json(mapToTask(data), { status: 201 });
  } catch (err: any) {
    const errorMsg =
      err?.message || err?.error_description || JSON.stringify(err);
    console.error("[POST /api/tasks] Error creating task:", errorMsg);

    if (errorMsg.includes("ENOTFOUND") || errorMsg.includes("getaddrinfo")) {
      return NextResponse.json(
        {
          error: "Cannot reach Supabase",
          details: "Check network connection and Supabase configuration",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
