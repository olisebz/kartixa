/**
 * Points Calculation Service — Computes race points after penalties.
 */

import { v4 as uuidv4 } from "uuid";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { drivers } from "@/server/db/schema";
import {
  calculatePoints,
  UNKNOWN_DRIVER_NAME,
  UNKNOWN_DRIVER_NUMBER,
} from "@/server/domain/constants";

export function calculatePointsAfterPenalties(input: {
  position: number;
  fastestLap: boolean;
  isUnknownDriver: boolean;
  dnf: boolean;
  penalties: { type: "seconds" | "grid" | "points"; value: number }[];
}): number {
  if (input.isUnknownDriver || input.dnf) return 0;

  const basePoints = calculatePoints(input.position, input.fastestLap);
  const pointsPenalty = input.penalties
    .filter((p) => p.type === "points")
    .reduce((sum, p) => sum + p.value, 0);

  return basePoints - pointsPenalty;
}

export async function getOrCreateUnknownDriverId(seasonId: string): Promise<string> {
  const db = getDb();

  const [existing] = await db
    .select({ id: drivers.id })
    .from(drivers)
    .where(
      and(
        eq(drivers.seasonId, seasonId),
        eq(drivers.name, UNKNOWN_DRIVER_NAME),
        eq(drivers.driverNumber, UNKNOWN_DRIVER_NUMBER),
      ),
    );

  if (existing) return existing.id;

  const id = uuidv4();
  await db.insert(drivers).values({
    id,
    seasonId,
    name: UNKNOWN_DRIVER_NAME,
    driverNumber: UNKNOWN_DRIVER_NUMBER,
  });

  return id;
}
