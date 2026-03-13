import { v4 as uuidv4 } from "uuid";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { leagueMemberships, users } from "../db/schema";
import { ConflictError, NotFoundError, ForbiddenError } from "../domain/errors";
import { hasElevatedLeagueRole, isLeagueRole } from "../auth/permissions";

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export const userService = {
  async register(input: RegisterUserInput) {
    const db = getDb();
    const normalizedEmail = input.email.trim().toLowerCase();

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail));
    if (existing) {
      throw new ConflictError("A user with this email already exists");
    }

    const passwordHash = await hash(input.password, 12);

    const id = uuidv4();
    await db.insert(users).values({
      id,
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
      emailVerifiedAt: new Date(),
    });

    return {
      id,
      name: input.name.trim(),
      email: normalizedEmail,
    };
  },

  async getById(userId: string) {
    const db = getDb();
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) throw new NotFoundError("User", userId);
    return user;
  },

  async updateName(userId: string, name: string) {
    const db = getDb();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId));

    if (!existing) throw new NotFoundError("User", userId);

    const memberships = await db
      .select({ role: leagueMemberships.role })
      .from(leagueMemberships)
      .where(eq(leagueMemberships.userId, userId));

    const hasElevatedRole = memberships.some(
      (membership) =>
        isLeagueRole(membership.role) && hasElevatedLeagueRole(membership.role),
    );

    if (memberships.length > 0 && !hasElevatedRole) {
      throw new ForbiddenError("Watcher members cannot edit profile name");
    }

    const trimmedName = name.trim();

    await db
      .update(users)
      .set({ name: trimmedName })
      .where(eq(users.id, userId));

    return {
      id: userId,
      name: trimmedName,
    };
  },
};
