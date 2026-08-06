/**
 * Example: POST /api/admin/roles
 * Demonstrates role-based access control with middleware
 */

import { NextRequest } from "next/server";
import {
  withApiMiddleware,
  ApiContext,
  parseRequestBody,
  createdResponse,
  ValidationException,
  ApiLogger,
} from "@/lib/apiMiddleware";
import type { Role } from "@/types/rbac";

/**
 * Handler for creating a new role (super_admin only)
 */
async function createRoleHandler(context: ApiContext): Promise<Role> {
  const { requestId } = context;

  // Parse request body
  const body = await parseRequestBody(context.request);

  // Validate required fields
  if (!body.name || typeof body.name !== "string") {
    throw new ValidationException("Name is required and must be a string");
  }

  if (body.name.length < 3) {
    throw new ValidationException("Name must be at least 3 characters long");
  }

  ApiLogger.log(requestId, `Creating role: ${body.name}`);

  // TODO: Save to database
  // const { data, error } = await supabase
  //   .from('roles')
  //   .insert([{
  //     name: body.name,
  //     description: body.description,
  //     is_system: false
  //   }])
  //   .select()
  //   .single();

  const newRole: Role = {
    id: "role-" + Date.now(),
    name: body.name,
    description: body.description || null,
    isSystem: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  ApiLogger.log(requestId, `Role created successfully: ${newRole.id}`);

  return newRole;
}

/**
 * Export with middleware
 * - Requires authentication
 * - Requires super_admin role
 * - Logs all requests
 * - Auto-handles errors
 */
export const POST = withApiMiddleware(createRoleHandler, {
  method: "POST /api/admin/roles",
  requireAuth: true,
  requireRole: ["super_admin"], // Only super admin can create roles
  logRequest: true,
});
