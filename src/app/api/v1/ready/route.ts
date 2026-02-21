/**
 * GET /api/v1/ready
 * Readiness check — verifies DB connectivity.
 */

import { NextResponse } from "next/server";
import { checkDbHealth } from "@/server/db";

export async function GET() {
  const dbOk = await checkDbHealth();

  if (!dbOk) {
    return NextResponse.json(
      { status: "not_ready", checks: { database: "failed" } },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "ready",
    checks: { database: "ok" },
    timestamp: new Date().toISOString(),
  });
}
