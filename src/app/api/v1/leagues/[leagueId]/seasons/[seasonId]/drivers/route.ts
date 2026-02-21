/**
 * GET  /api/v1/leagues/:leagueId/seasons/:seasonId/drivers        — List drivers
 * POST /api/v1/leagues/:leagueId/seasons/:seasonId/drivers        — Add driver (admin)
 */

import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { driverService } from "@/server/services/driverService";
import { createDriverSchema, type CreateDriverInput } from "@/server/domain/schemas";
import { successResponse } from "@/server/domain/dto";
import { ROLES } from "@/server/domain/constants";

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const drivers = await driverService.listBySeason(
      ctx.params.leagueId,
      ctx.params.seasonId
    );
    return NextResponse.json(successResponse(drivers));
  },
});

export const POST = apiHandler<CreateDriverInput>({
  role: ROLES.ADMIN,
  bodySchema: createDriverSchema,
  handler: async (_req, ctx, body) => {
    const driver = await driverService.create(
      ctx.params.leagueId,
      ctx.params.seasonId,
      body
    );
    return NextResponse.json(successResponse(driver), { status: 201 });
  },
});

export const OPTIONS = optionsHandler();
