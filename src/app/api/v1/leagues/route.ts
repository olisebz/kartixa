/**
 * GET  /api/v1/leagues       — List all leagues
 * POST /api/v1/leagues       — Create a league (admin)
 */

import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { leagueService } from "@/server/services/leagueService";
import { createLeagueSchema, type CreateLeagueInput } from "@/server/domain/schemas";
import { successResponse } from "@/server/domain/dto";
import { requireUserId } from "@/server/auth/guards";

export const GET = apiHandler({
  handler: async () => {
    const userId = await requireUserId();
    const leagues = await leagueService.list(userId);
    return NextResponse.json(successResponse(leagues));
  },
});

export const POST = apiHandler<CreateLeagueInput>({
  bodySchema: createLeagueSchema,
  handler: async (_req, _ctx, body) => {
    const userId = await requireUserId();
    const league = await leagueService.create(body, userId);
    return NextResponse.json(successResponse(league), { status: 201 });
  },
});

export const OPTIONS = optionsHandler();
