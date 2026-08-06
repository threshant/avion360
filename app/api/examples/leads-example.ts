/**
 * Example: GET /api/leads
 * Demonstrates how to use API middleware wrapper
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withApiMiddleware,
  ApiContext,
  getQueryParams,
  ApiLogger,
  ValidationException,
} from "@/lib/apiMiddleware";

/**
 * Handler function - business logic only
 * All middleware validation is handled by withApiMiddleware wrapper
 */
async function getLeadsHandler(context: ApiContext) {
  const { requestId } = context;

  // Parse query params if needed
  const params = getQueryParams(context.request);
  const limit = parseInt(params.limit || "10", 10);
  const offset = parseInt(params.offset || "0", 10);

  if (limit < 1 || limit > 100) {
    throw new ValidationException("Limit must be between 1 and 100");
  }

  ApiLogger.log(
    requestId,
    `Fetching leads - limit: ${limit}, offset: ${offset}`,
  );

  // TODO: Your actual database query here
  // const leads = await supabase
  //   .from('leads')
  //   .select('*')
  //   .range(offset, offset + limit - 1);

  const leads = [
    { id: 1, name: "Lead 1", email: "lead1@example.com" },
    { id: 2, name: "Lead 2", email: "lead2@example.com" },
  ];

  return {
    leads,
    total: 2,
    limit,
    offset,
  };
}

/**
 * Export wrapped handler
 * Middleware will:
 * - Check authentication
 * - Create request ID
 * - Log requests
 * - Handle errors
 * - Format responses
 */
export const GET = withApiMiddleware(getLeadsHandler, {
  method: "GET /api/leads",
  requireAuth: true,
  logRequest: true,
});
