import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

type StageColumnRow = {
  stage_id: string | null;
  stage_name: string | null;
  stage_position: number | null;
};

const UNKNOWN_STAGE_POSITION = Number.MAX_SAFE_INTEGER;

export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const supabase = createServerSupabaseClient();

    const [
      { data: customColumns, error: columnsError },
      { data: stages, error: stagesError },
    ] = await Promise.all([
      supabase
        .from("lead_kanban_columns")
        .select("id, name, position, stage_name")
        .eq("tenant_id", tenantId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("leads")
        .select("stage_id, stage_name, stage_position")
        .eq("tenant_id", tenantId)
        .not("stage_name", "is", null)
        .order("stage_position", { ascending: true, nullsFirst: false }),
    ]);

    if (columnsError) throw columnsError;
    if (stagesError) throw stagesError;

    const defaultColumns = Array.from(
      new Map(
        ((stages || []) as StageColumnRow[])
          .filter((stage) => stage.stage_name)
          .map((stage) => [
            stage.stage_id || stage.stage_name || "",
            {
              id: `stage:${stage.stage_id || stage.stage_name}`,
              name: stage.stage_name!,
              stageId: stage.stage_id,
              position: stage.stage_position ?? UNKNOWN_STAGE_POSITION,
              type: "default" as const,
            },
          ]),
      ).values(),
    ).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));

    return NextResponse.json(
      {
        data: [
          ...defaultColumns,
          ...(customColumns || []).map((column) => ({
            id: column.id,
            name: column.name,
            position: column.position,
            stageName: column.stage_name,
            type: "custom" as const,
          })),
        ],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch lead columns:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead columns" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const body = await request.json();
    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Column name is required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();
    const { data: lastColumn } = await supabase
      .from("lead_kanban_columns")
      .select("position")
      .eq("tenant_id", tenantId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (lastColumn?.position ?? -1) + 1;

    const { data, error } = await supabase
      .from("lead_kanban_columns")
      .insert({
        name,
        position: nextPosition,
        tenant_id: tenantId,
      })
      .select("id, name, position, stage_name")
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        data: {
          id: data.id,
          name: data.name,
          position: data.position,
          stageName: data.stage_name,
          type: "custom" as const,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create lead column:", error);
    return NextResponse.json(
      { error: "Failed to create lead column" },
      { status: 500 },
    );
  }
}
