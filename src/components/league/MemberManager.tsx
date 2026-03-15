"use client";

import { Shield } from "lucide-react";
import Button from "@/components/Button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/Table";
import type { LeagueMemberDTO } from "@/server/domain/dto";

interface MemberManagerProps {
  members: LeagueMemberDTO[];
  loading: boolean;
  error: string | null;
  currentUserId: string | null;
  onUpdateRole: (memberId: string, role: "admin" | "member") => void;
  onRemove: (memberId: string) => void;
  t: (key: string) => string;
}

export default function MemberManager({
  members,
  loading,
  error,
  currentUserId,
  onUpdateRole,
  onRemove,
  t,
}: MemberManagerProps) {
  return (
    <div className="bg-[var(--color-card)] rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-[var(--color-primary)]" />
        {t("league.membersRoles")}
      </h2>
      <p className="text-sm text-[var(--color-muted)] mb-4">{t("league.membersRolesDesc")}</p>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">{t("common.loading")}</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{t("league.noMembers")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("league.nameLabel")}</TableHead>
              <TableHead>{t("league.emailLabel")}</TableHead>
              <TableHead>{t("league.roleLabel")}</TableHead>
              <TableHead className="text-right">{t("league.actionLabel")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.membershipId}>
                <TableCell>{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>{member.role}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {member.role === "owner" ? (
                      <span className="text-sm text-[var(--color-muted)]">{t("league.ownerLabel")}</span>
                    ) : member.role === "member" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateRole(member.membershipId, "admin")}
                      >
                        {t("league.makeAdmin")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onUpdateRole(member.membershipId, "member")}
                      >
                        {t("league.removeAdmin")}
                      </Button>
                    )}

                    {member.role !== "owner" && member.userId !== currentUserId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRemove(member.membershipId)}
                      >
                        {t("league.removeMember")}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
