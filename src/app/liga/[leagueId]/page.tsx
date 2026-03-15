"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { Calendar, Edit, Plus, Loader2, Trash2 } from "lucide-react";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import DriverRankings from "@/components/league/DriverRankings";
import RacesList from "@/components/league/RacesList";
import TeamStandings from "@/components/league/TeamStandings";
import InviteCodeManager from "@/components/league/InviteCodeManager";
import MemberManager from "@/components/league/MemberManager";
import { api } from "@/lib/api";
import { useLocale } from "@/LocaleContext";
import type {
  LeagueDetailDTO,
  DriverDTO,
  TeamRankingDTO,
  RaceListDTO,
  LeagueInviteCodeDTO,
  LeagueMemberDTO,
} from "@/server/domain/dto";
import type { CreateInviteCodeInput } from "@/server/domain/schemas";

export default function LeagueDetailPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const { t, locale } = useLocale();

  // League & season data
  const [league, setLeague] = useState<LeagueDetailDTO | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [drivers, setDrivers] = useState<DriverDTO[]>([]);
  const [teamRankings, setTeamRankings] = useState<TeamRankingDTO[]>([]);
  const [races, setRaces] = useState<RaceListDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Driver stats modal
  const [selectedDriver, setSelectedDriver] = useState<DriverDTO | null>(null);

  // Access management (admin only)
  const [members, setMembers] = useState<LeagueMemberDTO[]>([]);
  const [invites, setInvites] = useState<LeagueInviteCodeDTO[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessNotice, setAccessNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Invite code form state
  const [newInviteRole, setNewInviteRole] = useState<"member" | "admin">("member");
  const [newInviteMaxUses, setNewInviteMaxUses] = useState("");
  const [newInviteExpiresAt, setNewInviteExpiresAt] = useState("");

  // Season management
  const [seasonNotice, setSeasonNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showCreateSeasonModal, setShowCreateSeasonModal] = useState(false);
  const [creatingSeason, setCreatingSeason] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState("");
  const [newSeasonStartDate, setNewSeasonStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [copyDriversToNewSeason, setCopyDriversToNewSeason] = useState(true);
  const [showDeleteSeasonModal, setShowDeleteSeasonModal] = useState(false);
  const [deletingSeason, setDeletingSeason] = useState(false);

  // Load league detail
  useEffect(() => {
    api.leagues
      .get(leagueId)
      .then((data) => {
        setLeague(data);
        const active = data.seasons.find((s) => s.isActive);
        const season = active || data.seasons[data.seasons.length - 1];
        if (season) setSelectedSeasonId(season.id);
      })
      .catch((err) => {
        if (err.status === 404) notFound();
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [leagueId]);

  const loadSeasonData = useCallback(async () => {
    if (!selectedSeasonId || !leagueId) return;
    try {
      const [driversData, racesData, teamsData] = await Promise.all([
        api.drivers.list(leagueId, selectedSeasonId),
        api.races.list(leagueId, selectedSeasonId),
        api.teams.listRankings(leagueId, selectedSeasonId),
      ]);
      setDrivers(driversData);
      setRaces(racesData);
      setTeamRankings(teamsData);
    } catch {
      setDrivers([]);
      setRaces([]);
      setTeamRankings([]);
    }
  }, [leagueId, selectedSeasonId]);

  useEffect(() => {
    loadSeasonData();
  }, [loadSeasonData]);

  const loadAccessData = useCallback(async () => {
    if (!leagueId) return;
    if (league?.currentUserRole === "member") {
      setMembers([]);
      setInvites([]);
      setAccessLoading(false);
      setAccessError(null);
      return;
    }
    setAccessLoading(true);
    setAccessError(null);
    try {
      const [memberData, inviteData, profile] = await Promise.all([
        api.leagues.members.list(leagueId),
        api.leagues.inviteCodes.list(leagueId),
        api.auth.profile.get(),
      ]);
      setMembers(memberData);
      setInvites(inviteData);
      setCurrentUserId(profile.id);
    } catch (err: unknown) {
      setAccessError(err instanceof Error ? err.message : "Failed to load access settings");
    } finally {
      setAccessLoading(false);
    }
  }, [leagueId, league?.currentUserRole]);

  useEffect(() => {
    loadAccessData();
  }, [loadAccessData]);

  const createInviteCode = async () => {
    const payload: CreateInviteCodeInput = {
      roleToGrant: newInviteRole,
      ...(newInviteMaxUses.trim() ? { maxUses: Number.parseInt(newInviteMaxUses.trim(), 10) } : {}),
      ...(newInviteExpiresAt ? { expiresAt: new Date(newInviteExpiresAt).toISOString() } : {}),
    };
    try {
      await api.leagues.inviteCodes.create(leagueId, payload);
      setNewInviteMaxUses("");
      setNewInviteExpiresAt("");
      await loadAccessData();
      setAccessNotice({ type: "success", message: t("league.codeCreated") });
    } catch (err: unknown) {
      setAccessNotice({ type: "error", message: err instanceof Error ? err.message : "Failed to create invite code" });
    }
  };

  const rotateInviteCode = async () => {
    const payload: CreateInviteCodeInput = {
      roleToGrant: newInviteRole,
      ...(newInviteMaxUses.trim() ? { maxUses: Number.parseInt(newInviteMaxUses.trim(), 10) } : {}),
      ...(newInviteExpiresAt ? { expiresAt: new Date(newInviteExpiresAt).toISOString() } : {}),
    };
    try {
      await api.leagues.inviteCodes.rotate(leagueId, payload);
      await loadAccessData();
      setAccessNotice({ type: "success", message: t("league.codeRotated") });
    } catch (err: unknown) {
      setAccessNotice({ type: "error", message: err instanceof Error ? err.message : "Failed to rotate invite code" });
    }
  };

  const deactivateInviteCode = async (inviteId: string) => {
    try {
      await api.leagues.inviteCodes.deactivate(leagueId, inviteId);
      await loadAccessData();
      setAccessNotice({ type: "success", message: t("league.codeDeactivated") });
    } catch (err: unknown) {
      setAccessNotice({ type: "error", message: err instanceof Error ? err.message : "Failed to deactivate invite code" });
    }
  };

  const copyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setAccessNotice({ type: "success", message: t("league.codeCopied") });
    } catch {
      setAccessNotice({ type: "error", message: t("league.copyFailed") });
    }
  };

  const updateMemberRole = async (memberId: string, role: "admin" | "member") => {
    try {
      await api.leagues.members.updateRole(leagueId, memberId, { role });
      await loadAccessData();
      setAccessNotice({ type: "success", message: `${t("league.memberRoleSet")} ${role}.` });
    } catch (err: unknown) {
      setAccessNotice({ type: "error", message: err instanceof Error ? err.message : "Failed to update role" });
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      await api.leagues.members.remove(leagueId, memberId);
      await loadAccessData();
      setAccessNotice({ type: "success", message: t("league.memberRemoved") });
    } catch (err: unknown) {
      setAccessNotice({ type: "error", message: err instanceof Error ? err.message : "Failed to remove member" });
    }
  };

  const openCreateSeasonModal = () => {
    if (!league) return;
    setNewSeasonName(`Season ${league.seasons.length + 1}`);
    setNewSeasonStartDate(new Date().toISOString().split("T")[0]);
    setCopyDriversToNewSeason(true);
    setShowCreateSeasonModal(true);
  };

  const handleCreateSeason = async () => {
    if (!newSeasonName.trim() || !newSeasonStartDate) {
      setSeasonNotice({ type: "error", message: t("season.nameRequired") });
      return;
    }
    setCreatingSeason(true);
    setSeasonNotice(null);
    try {
      await api.seasons.create(leagueId, {
        name: newSeasonName.trim(),
        startDate: newSeasonStartDate,
        carryDrivers: copyDriversToNewSeason,
      });
      const updated = await api.leagues.get(leagueId);
      setLeague(updated);
      const newSeason =
        updated.seasons.find((s) => s.isActive) || updated.seasons[updated.seasons.length - 1];
      if (newSeason) setSelectedSeasonId(newSeason.id);
      setShowCreateSeasonModal(false);
      await loadSeasonData();
      setSeasonNotice({
        type: "success",
        message: copyDriversToNewSeason ? t("season.createdWithDrivers") : t("season.created"),
      });
    } catch (err: unknown) {
      setSeasonNotice({ type: "error", message: err instanceof Error ? err.message : t("season.createFailed") });
    } finally {
      setCreatingSeason(false);
    }
  };

  const handleDeleteSeason = async () => {
    if (!selectedSeasonId) return;
    setDeletingSeason(true);
    setSeasonNotice(null);
    try {
      await api.seasons.delete(leagueId, selectedSeasonId);
      const updated = await api.leagues.get(leagueId);
      setLeague(updated);
      const nextSeason =
        updated.seasons.find((s) => s.isActive) || updated.seasons[updated.seasons.length - 1];
      if (nextSeason) setSelectedSeasonId(nextSeason.id);
      await loadSeasonData();
      setShowDeleteSeasonModal(false);
      setSeasonNotice({ type: "success", message: t("season.deleted") });
    } catch (err: unknown) {
      setSeasonNotice({ type: "error", message: err instanceof Error ? err.message : t("season.deleteFailed") });
    } finally {
      setDeletingSeason(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-600 mb-4">{t("common.failedLoad")}: {error}</p>
        <Button onClick={() => window.location.reload()}>{t("common.retry")}</Button>
      </div>
    );
  }

  const currentSeason = league.seasons.find((s) => s.id === selectedSeasonId);
  const isWatcher = league.currentUserRole === "member";
  const canManageLeague = !isWatcher;

  return (
    <div className="py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <Button href="/liga" variant="secondary" size="sm" className="mb-4">
          {t("league.backToLeagues")}
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] truncate">
              {league.name}
            </h1>
            <p className="text-[var(--color-muted)] mt-1 text-sm sm:text-base">{league.description}</p>
          </div>
          <div className="flex flex-row sm:flex-col gap-2 shrink-0">
            {canManageLeague && (
              <>
                <Button href={`/liga/${leagueId}/edit`} variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <Edit className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t("league.edit")}</span>
                  <span className="sm:hidden">{t("league.editShort")}</span>
                </Button>
                <Button onClick={openCreateSeasonModal} size="sm" className="flex-1 sm:flex-none">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t("league.newSeason")}</span>
                  <span className="sm:hidden">{t("league.newSeasonShort")}</span>
                </Button>
              </>
            )}
            {seasonNotice && (
              <p className={`text-sm ${seasonNotice.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {seasonNotice.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Season Selector */}
      {league.seasons.length > 0 && currentSeason && (
        <div className="mb-6 bg-[var(--color-card)] rounded-xl p-4 flex flex-wrap items-center gap-3">
          <label
            htmlFor="season-select"
            className="font-medium text-[var(--foreground)] flex items-center gap-2 shrink-0"
          >
            <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
            {t("league.seasonLabel")}
          </label>
          <select
            id="season-select"
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="flex-1 min-w-0 bg-white border border-[var(--color-border)] text-[var(--foreground)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
          >
            {league.seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name} ({new Date(currentSeason.startDate).getFullYear()})
              </option>
            ))}
          </select>
          {canManageLeague && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteSeasonModal(true)}
              disabled={league.seasons.length <= 1}
              className="shrink-0"
            >
              <Trash2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("league.deleteSeason")}</span>
            </Button>
          )}
        </div>
      )}

      {/* Driver Rankings + Races */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DriverRankings
          drivers={drivers}
          leagueId={leagueId}
          canManageLeague={canManageLeague}
          selectedDriver={selectedDriver}
          onSelectDriver={setSelectedDriver}
          t={t}
          locale={locale}
        />
        <RacesList
          races={races}
          leagueId={leagueId}
          canManageLeague={canManageLeague}
          t={t}
          locale={locale}
        />
      </div>

      {/* Team Standings */}
      <TeamStandings teamRankings={teamRankings} t={t} />

      {/* Access Management (admin only) */}
      {canManageLeague && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <InviteCodeManager
            leagueId={leagueId}
            invites={invites}
            loading={accessLoading}
            notice={accessNotice}
            newRole={newInviteRole}
            newMaxUses={newInviteMaxUses}
            newExpiresAt={newInviteExpiresAt}
            onRoleChange={setNewInviteRole}
            onMaxUsesChange={setNewInviteMaxUses}
            onExpiresAtChange={setNewInviteExpiresAt}
            onCreate={createInviteCode}
            onRotate={rotateInviteCode}
            onDeactivate={deactivateInviteCode}
            onCopy={copyInviteCode}
            t={t}
          />
          <MemberManager
            members={members}
            loading={accessLoading}
            error={accessError}
            currentUserId={currentUserId}
            onUpdateRole={updateMemberRole}
            onRemove={removeMember}
            t={t}
          />
        </div>
      )}

      {/* Season Modals */}
      {canManageLeague && (
        <>
          <Modal
            isOpen={showCreateSeasonModal}
            onClose={() => { if (!creatingSeason) setShowCreateSeasonModal(false); }}
            title={t("season.create")}
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" className="w-full" onClick={() => setShowCreateSeasonModal(false)} disabled={creatingSeason}>
                  {t("common.cancel")}
                </Button>
                <Button className="w-full" onClick={handleCreateSeason} disabled={creatingSeason}>
                  {creatingSeason ? t("season.creating") : t("season.create")}
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <Input label={t("season.nameLabel")} value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)} placeholder={t("season.namePlaceholder")} />
              <Input label={t("season.startDate")} type="date" value={newSeasonStartDate} onChange={(e) => setNewSeasonStartDate(e.target.value)} />
              <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[var(--color-primary)]"
                  checked={copyDriversToNewSeason}
                  onChange={(e) => setCopyDriversToNewSeason(e.target.checked)}
                />
                {t("season.copyDrivers")}
              </label>
            </div>
          </Modal>

          <Modal
            isOpen={showDeleteSeasonModal}
            onClose={() => { if (!deletingSeason) setShowDeleteSeasonModal(false); }}
            title={t("season.delete")}
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" className="w-full" onClick={() => setShowDeleteSeasonModal(false)} disabled={deletingSeason}>
                  {t("common.cancel")}
                </Button>
                <Button className="w-full" onClick={handleDeleteSeason} disabled={deletingSeason || league.seasons.length <= 1}>
                  {deletingSeason ? t("season.deleting") : t("season.delete")}
                </Button>
              </div>
            }
          >
            <p className="text-sm text-[var(--color-muted)]">{t("season.deleteConfirm")}</p>
          </Modal>
        </>
      )}
    </div>
  );
}
