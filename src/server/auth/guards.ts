import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/server/db";
import { leagueMemberships } from "@/server/db/schema";
import { ForbiddenError, UnauthorizedError } from "@/server/domain/errors";
import {
  hasMinLeagueRole,
  isLeagueRole,
  type LeagueRoleLevel,
} from "./permissions";

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new UnauthorizedError();
  }

  return userId;
}

export async function requireCurrentAuthSessionId(): Promise<string> {
  const session = await auth();
  const sessionId = session?.user?.currentSessionId;

  if (!sessionId) {
    throw new UnauthorizedError();
  }

  return sessionId;
}

export async function getLeagueRole(leagueId: string, userId: string): Promise<LeagueRoleLevel | null> {
  const db = getDb();
  const [membership] = await db
    .select({ role: leagueMemberships.role })
    .from(leagueMemberships)
    .where(and(eq(leagueMemberships.leagueId, leagueId), eq(leagueMemberships.userId, userId)));

  if (!membership) return null;
  if (!isLeagueRole(membership.role)) {
    return null;
  }

  return membership.role;
}

export async function requireLeagueRole(
  leagueId: string,
  userId: string,
  minRole: LeagueRoleLevel
): Promise<LeagueRoleLevel> {
  const role = await getLeagueRole(leagueId, userId);
  if (!role) {
    throw new ForbiddenError("You are not a member of this league");
  }

  if (!hasMinLeagueRole(role, minRole)) {
    throw new ForbiddenError("Insufficient league permissions");
  }

  return role;
}
