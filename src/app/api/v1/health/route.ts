/**
 * GET /api/v1/health
 * Health check endpoint — always returns 200 if the server is up.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
