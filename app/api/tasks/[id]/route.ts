import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createNotification } from "@/lib/notifications";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { UpdateTaskPayload } from "@/types/task";
import { NextRequest, NextResponse } from "next/server";

const TABLE_NAME = "tasks";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const supabase = createServerSupabaseClient();
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("Error fetching task:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actorUserId = getUserIdFromRequest(req);
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const supabase = createServerSupabaseClient();
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const payload: UpdateTaskPayload = await req.json();

    const { data: existingTask } = await supabase
      .from(TABLE_NAME)
      .select("id, title, assigned_to")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    const updateData: any = {};
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.description !== undefined)
      updateData.description = payload.description;
    if (payload.type !== undefined) updateData.type = payload.type;
    if (payload.priority !== undefined) updateData.priority = payload.priority;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.assignedTo !== undefined)
      updateData.assigned_to = payload.assignedTo;
    if (payload.dueDate !== undefined) updateData.due_date = payload.dueDate;
    if (payload.completedAt !== undefined)
      updateData.completed_at = payload.completedAt;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) throw error;

    if (
      payload.assignedTo !== undefined &&
      payload.assignedTo &&
      payload.assignedTo !== existingTask?.assigned_to &&
      payload.assignedTo !== actorUserId
    ) {
      await createNotification(supabase, {
        userId: payload.assignedTo,
        tenantId,
        title: "Task Reassigned",
        message: `You were assigned task: ${existingTask?.title ?? "Untitled Task"}`,
        category: "task",
        eventType: "task_reassigned",
        entityType: "task",
        entityId: String(id),
        actorUserId,
        metadata: {
          taskId: id,
          previousAssignee: existingTask?.assigned_to ?? null,
        },
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Error updating task:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const supabase = createServerSupabaseClient();
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting task:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
