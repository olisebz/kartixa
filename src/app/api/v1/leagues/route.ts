/**
 * GET  /api/v1/leagues       — List all leagues
 * POST /api/v1/leagues       — Create a league (admin)
 */

import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { leagueService } from "@/server/services/leagueService";
import { createLeagueSchema, type CreateLeagueInput } from "@/server/domain/schemas";
import { successResponse } from "@/server/domain/dto";
import { ROLES } from "@/server/domain/constants";

export const GET = apiHandler({
  handler: async () => {
    const leagues = await leagueService.list();
    return NextResponse.json(successResponse(leagues));
  },
});

export const POST = apiHandler<CreateLeagueInput>({
  role: ROLES.ADMIN,
  bodySchema: createLeagueSchema,
  handler: async (_req, _ctx, body) => {
    const league = await leagueService.create(body);
    return NextResponse.json(successResponse(league), { status: 201 });
  },
});

export const OPTIONS = optionsHandler();
