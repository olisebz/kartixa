import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { leagueInviteCodes, leagueMemberships, users } from "../db/schema";
import { ConflictError, NotFoundError, ValidationError } from "../domain/errors";
import type { LeagueInviteCodeDTO, LeagueMemberDTO } from "../domain/dto";
import { logger } from "../logger";

export const leagueAccessService = {
  async createOwnerMembership(leagueId: string, userId: string): Promise<void> {
    const db = getDb();

    await db.insert(leagueMemberships).values({
      id: uuidv4(),
      leagueId,
      userId,
      role: "owner",
    });
  },

  async listMembers(leagueId: string): Promise<LeagueMemberDTO[]> {
    const db = getDb();

    const rows = await db
      .select({
        membershipId: leagueMemberships.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        role: leagueMemberships.role,
        createdAt: leagueMemberships.createdAt,
      })
      .from(leagueMemberships)
      .innerJoin(users, eq(users.id, leagueMemberships.userId))
      .where(eq(leagueMemberships.leagueId, leagueId));

    return rows.map((row) => ({
      membershipId: row.membershipId,
      userId: row.userId,
      name: row.name,
      email: row.email,
      role: row.role as "owner" | "admin" | "member",
      createdAt: row.createdAt.toISOString(),
    }));
  },

  async updateMemberRole(leagueId: string, membershipId: string, role: "admin" | "member"): Promise<LeagueMemberDTO> {
    const db = getDb();

    const [target] = await db
      .select({ id: leagueMemberships.id, role: leagueMemberships.role })
      .from(leagueMemberships)
      .where(and(eq(leagueMemberships.id, membershipId), eq(leagueMemberships.leagueId, leagueId)));

    if (!target) {
      throw new NotFoundError("Membership", membershipId);
    }

    if (target.role === "owner") {
      throw new ValidationError("Owner role cannot be changed");
    }

    await db
      .update(leagueMemberships)
      .set({ role })
      .where(and(eq(leagueMemberships.id, membershipId), eq(leagueMemberships.leagueId, leagueId)));

    logger.info("League member role updated", {
      leagueId,
      membershipId,
      role,
    });

    const members = await this.listMembers(leagueId);
    const updated = members.find((member) => member.membershipId === membershipId);

    if (!updated) throw new NotFoundError("Membership", membershipId);
    return updated;
  },

  async removeMember(leagueId: string, membershipId: string): Promise<{ removed: boolean }> {
    const db = getDb();

    const [membership] = await db
      .select({ id: leagueMemberships.id, role: leagueMemberships.role })
      .from(leagueMemberships)
      .where(and(eq(leagueMemberships.id, membershipId), eq(leagueMemberships.leagueId, leagueId)));

    if (!membership) throw new NotFoundError("Membership", membershipId);
    if (membership.role === "owner") {
      throw new ValidationError("Owner cannot be removed from league");
    }

    await db
      .delete(leagueMemberships)
      .where(and(eq(leagueMemberships.id, membershipId), eq(leagueMemberships.leagueId, leagueId)));

    logger.info("League member removed", {
      leagueId,
      membershipId,
    });

    return { removed: true };
  },

  async leaveLeague(leagueId: string, userId: string): Promise<{ left: boolean }> {
    const db = getDb();

    const [membership] = await db
      .select({ id: leagueMemberships.id, role: leagueMemberships.role })
      .from(leagueMemberships)
      .where(and(eq(leagueMemberships.leagueId, leagueId), eq(leagueMemberships.userId, userId)));

    if (!membership) {
      throw new NotFoundError("Membership", `${leagueId}:${userId}`);
    }

    if (membership.role === "owner") {
      throw new ValidationError("Owner cannot leave league. Transfer ownership or delete the league.");
    }

    await db
      .delete(leagueMemberships)
      .where(eq(leagueMemberships.id, membership.id));

    logger.info("User left league", {
      leagueId,
      userId,
    });

    return { left: true };
  },

  async listInviteCodes(leagueId: string): Promise<LeagueInviteCodeDTO[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(leagueInviteCodes)
      .where(eq(leagueInviteCodes.leagueId, leagueId));

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      roleToGrant: row.roleToGrant as "admin" | "member",
      maxUses: row.maxUses,
      usedCount: row.usedCount,
      isActive: row.isActive,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    }));
  },

  async createInviteCode(
    leagueId: string,
    actorUserId: string,
    input: { roleToGrant: "admin" | "member"; maxUses?: number; expiresAt?: string }
  ): Promise<LeagueInviteCodeDTO> {
    const db = getDb();

    const id = uuidv4();
    const code = await this.generateUniqueCode();

    await db.insert(leagueInviteCodes).values({
      id,
      leagueId,
      code,
      roleToGrant: input.roleToGrant,
      maxUses: input.maxUses ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      createdByUserId: actorUserId,
    });

    logger.info("League invite code created", {
      leagueId,
      inviteId: id,
      roleToGrant: input.roleToGrant,
      createdByUserId: actorUserId,
    });

    const [created] = await db.select().from(leagueInviteCodes).where(eq(leagueInviteCodes.id, id));
    if (!created) throw new NotFoundError("InviteCode", id);

    return {
      id: created.id,
      code: created.code,
      roleToGrant: created.roleToGrant as "admin" | "member",
      maxUses: created.maxUses,
      usedCount: created.usedCount,
      isActive: created.isActive,
      expiresAt: created.expiresAt ? created.expiresAt.toISOString() : null,
      createdAt: created.createdAt.toISOString(),
    };
  },

  async rotateInviteCode(
    leagueId: string,
    actorUserId: string,
    input: { roleToGrant: "admin" | "member"; maxUses?: number; expiresAt?: string }
  ): Promise<LeagueInviteCodeDTO> {
    const db = getDb();

    await db
      .update(leagueInviteCodes)
      .set({ isActive: false })
      .where(and(eq(leagueInviteCodes.leagueId, leagueId), eq(leagueInviteCodes.isActive, true)));

    logger.info("League invite codes rotated", {
      leagueId,
      actorUserId,
    });

    return this.createInviteCode(leagueId, actorUserId, input);
  },

  async deactivateInviteCode(leagueId: string, inviteId: string): Promise<LeagueInviteCodeDTO> {
    const db = getDb();

    const [invite] = await db
      .select()
      .from(leagueInviteCodes)
      .where(and(eq(leagueInviteCodes.id, inviteId), eq(leagueInviteCodes.leagueId, leagueId)));

    if (!invite) throw new NotFoundError("InviteCode", inviteId);

    await db
      .update(leagueInviteCodes)
      .set({ isActive: false })
      .where(and(eq(leagueInviteCodes.id, inviteId), eq(leagueInviteCodes.leagueId, leagueId)));

    logger.info("League invite code deactivated", {
      leagueId,
      inviteId,
    });

    return {
      id: invite.id,
      code: invite.code,
      roleToGrant: invite.roleToGrant as "admin" | "member",
      maxUses: invite.maxUses,
      usedCount: invite.usedCount,
      isActive: false,
      expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
      createdAt: invite.createdAt.toISOString(),
    };
  },

  async joinByCode(userId: string, code: string): Promise<{ leagueId: string; role: "admin" | "member" }> {
    const db = getDb();

    const [invite] = await db.select().from(leagueInviteCodes).where(eq(leagueInviteCodes.code, code));
    if (!invite) throw new NotFoundError("InviteCode", code);

    if (!invite.isActive) {
      throw new ValidationError("Invite code is not active");
    }

    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      throw new ValidationError("Invite code has expired");
    }

    if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
      throw new ValidationError("Invite code usage limit reached");
    }

    const [existing] = await db
      .select({ id: leagueMemberships.id })
      .from(leagueMemberships)
      .where(and(eq(leagueMemberships.leagueId, invite.leagueId), eq(leagueMemberships.userId, userId)));

    if (existing) {
      throw new ConflictError("You are already a member of this league");
    }

    await db.insert(leagueMemberships).values({
      id: uuidv4(),
      leagueId: invite.leagueId,
      userId,
      role: invite.roleToGrant,
    });

    await db
      .update(leagueInviteCodes)
      .set({ usedCount: invite.usedCount + 1 })
      .where(eq(leagueInviteCodes.id, invite.id));

    logger.info("User joined league by invite code", {
      leagueId: invite.leagueId,
      userId,
      inviteCodeId: invite.id,
      grantedRole: invite.roleToGrant,
    });

    return {
      leagueId: invite.leagueId,
      role: invite.roleToGrant as "admin" | "member",
    };
  },

  generateCode(): string {
    return Math.random().toString(36).slice(2, 10).toUpperCase();
  },

  async generateUniqueCode(): Promise<string> {
    const db = getDb();

    for (let i = 0; i < 10; i += 1) {
      const code = this.generateCode();
      const [existing] = await db
        .select({ id: leagueInviteCodes.id })
        .from(leagueInviteCodes)
        .where(eq(leagueInviteCodes.code, code));

      if (!existing) return code;
    }

    throw new ValidationError("Failed to generate a unique invite code");
  },
};
