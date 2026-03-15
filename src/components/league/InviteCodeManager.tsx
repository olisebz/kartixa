"use client";

import { Share2 } from "lucide-react";
import Button from "@/components/Button";
import Input from "@/components/forms/Input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/Table";
import type { LeagueInviteCodeDTO } from "@/server/domain/dto";

interface InviteCodeManagerProps {
  leagueId: string;
  invites: LeagueInviteCodeDTO[];
  loading: boolean;
  notice: { type: "success" | "error"; message: string } | null;
  newRole: "member" | "admin";
  newMaxUses: string;
  newExpiresAt: string;
  onRoleChange: (role: "member" | "admin") => void;
  onMaxUsesChange: (val: string) => void;
  onExpiresAtChange: (val: string) => void;
  onCreate: () => void;
  onRotate: () => void;
  onDeactivate: (id: string) => void;
  onCopy: (code: string) => void;
  t: (key: string) => string;
}

export default function InviteCodeManager({
  invites,
  loading,
  notice,
  newRole,
  newMaxUses,
  newExpiresAt,
  onRoleChange,
  onMaxUsesChange,
  onExpiresAtChange,
  onCreate,
  onRotate,
  onDeactivate,
  onCopy,
  t,
}: InviteCodeManagerProps) {
  return (
    <div className="bg-[var(--color-card)] rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2 mb-3">
        <Share2 className="w-5 h-5 text-[var(--color-primary)]" />
        {t("league.inviteCodes")}
      </h2>
      <p className="text-sm text-[var(--color-muted)] mb-4">{t("league.inviteCodesDesc")}</p>

      {notice && (
        <p
          className={`text-sm mb-3 ${
            notice.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {notice.message}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            {t("league.roleLabel")}
          </label>
          <select
            value={newRole}
            onChange={(e) => onRoleChange(e.target.value as "admin" | "member")}
            className="w-full bg-white border border-[var(--color-border)] rounded-lg px-3 py-2"
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <Input
          label={t("league.maxUsesLabel")}
          value={newMaxUses}
          onChange={(e) => onMaxUsesChange(e.target.value)}
          placeholder="e.g. 10"
        />

        <Input
          label={t("league.expiresLabel")}
          type="datetime-local"
          value={newExpiresAt}
          onChange={(e) => onExpiresAtChange(e.target.value)}
        />

        <div className="flex items-end">
          <Button onClick={onRotate} variant="secondary" className="w-full">
            {t("league.rotateCode")}
          </Button>
        </div>

        <div className="flex items-end">
          <Button onClick={onCreate} className="w-full">
            {t("league.createCode")}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">{t("common.loading")}</p>
      ) : invites.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{t("league.noInviteCodes")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("league.inviteCodeLabel")}</TableHead>
              <TableHead>{t("league.roleLabel")}</TableHead>
              <TableHead>{t("league.statusLabel")}</TableHead>
              <TableHead className="text-right">{t("league.actionLabel")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell className="font-mono">{invite.code}</TableCell>
                <TableCell>{invite.roleToGrant}</TableCell>
                <TableCell>
                  {invite.isActive
                    ? `${t("league.statusActive")} (${invite.usedCount}${invite.maxUses ? `/${invite.maxUses}` : ""})${invite.expiresAt ? ` • exp ${new Date(invite.expiresAt).toLocaleString()}` : ""}`
                    : t("league.statusInactive")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => onCopy(invite.code)}>
                      {t("league.copyCode")}
                    </Button>
                    {invite.isActive ? (
                      <Button size="sm" variant="outline" onClick={() => onDeactivate(invite.id)}>
                        {t("league.deactivateCode")}
                      </Button>
                    ) : (
                      <span className="text-sm text-[var(--color-muted)]">—</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
