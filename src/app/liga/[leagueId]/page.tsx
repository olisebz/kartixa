"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import {
  Trophy,
  Award,
  TrendingUp,
  Target,
  Calendar,
  Medal,
  Users,
  Edit,
  Plus,
  Flag,
  Loader2,
  Share2,
  Shield,
  Trash2,
} from "lucide-react";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/Table";
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

const MEDAL_ICONS: Record<number, string> = {
  1: "🥇 ",
  2: "🥈 ",
  3: "🥉 ",
};

function getRankDisplay(rank: number): string {
  return MEDAL_ICONS[rank] || String(rank);
}

function DriverStats({
  driver,
  t,
  locale,
}: {
  driver: DriverDTO;
  t: (key: string) => string;
  locale: "de" | "en";
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <Target className="w-6 h-6 mx-auto mb-2 text-[var(--color-primary)]" />
          <div className="text-3xl font-bold text-[var(--color-primary)]">
            {driver.totalPoints}
          </div>
          <div className="text-sm text-[var(--color-muted)]">Total Points</div>
        </div>
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
          <div className="text-3xl font-bold text-[var(--color-primary)]">
            {driver.wins}
          </div>
          <div className="text-sm text-[var(--color-muted)]">Wins</div>
        </div>
      </div>

      <div className="bg-[var(--color-card)] rounded-xl p-4">
        <div className="flex justify-between items-center">
          <span className="text-[var(--color-muted)] flex items-center gap-2">
            <Flag className="w-4 h-4" />
            Races Started
          </span>
          <span className="font-semibold">{driver.races}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-[var(--color-muted)] flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Win Rate
          </span>
          <span className="font-semibold">
            {driver.races > 0
              ? `${Math.round((driver.wins / driver.races) * 100)}%`
              : "0%"}
          </span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-[var(--color-muted)] flex items-center gap-2">
            <Award className="w-4 h-4" />
            Avg Points/Race
          </span>
          <span className="font-semibold">
            {driver.races > 0
              ? (driver.totalPoints / driver.races).toFixed(1)
              : "0"}
          </span>
        </div>
      </div>

      <div className="bg-[var(--color-card)] rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[var(--color-muted)]">
            {t("penalties.history")}
          </span>
          <span className="font-semibold">
            {driver.penaltiesHistory.length}
          </span>
        </div>

        {driver.penaltiesHistory.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            {t("penalties.noneSeason")}
          </p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {driver.penaltiesHistory.map((penalty) => (
              <div
                key={penalty.id}
                className="text-sm border border-[var(--color-border)] rounded-lg px-3 py-2"
              >
                <div className="font-medium">
                  {penalty.raceName} •{" "}
                  {new Date(penalty.raceDate).toLocaleDateString(
                    locale === "de" ? "de-DE" : "en-US",
                  )}
                </div>
                <div className="text-[var(--color-muted)]">
                  {penalty.type === "points"
                    ? `${t("penalties.detailPoints")}: -${penalty.value}`
                    : penalty.type === "seconds"
                      ? `${t("penalties.detailSeconds")}: ${penalty.value}s`
                      : `${t("penalties.detailGrid")}: +${penalty.value} ${t("penalties.detailGridPlaces")}`}
                </div>
                {penalty.note && (
                  <div className="text-[var(--color-muted)]">
                    {t("penalties.notePrefix")} {penalty.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeagueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leagueId = params.leagueId as string;
  const { t, locale } = useLocale();

  const [league, setLeague] = useState<LeagueDetailDTO | null>(null);
  const [drivers, setDrivers] = useState<DriverDTO[]>([]);
  const [teamRankings, setTeamRankings] = useState<TeamRankingDTO[]>([]);
  const [races, setRaces] = useState<RaceListDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [selectedDriver, setSelectedDriver] = useState<DriverDTO | null>(null);
  const [members, setMembers] = useState<LeagueMemberDTO[]>([]);
  const [invites, setInvites] = useState<LeagueInviteCodeDTO[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accessNotice, setAccessNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [newInviteRole, setNewInviteRole] = useState<"member" | "admin">(
    "member",
  );
  const [newInviteMaxUses, setNewInviteMaxUses] = useState("");
  const [newInviteExpiresAt, setNewInviteExpiresAt] = useState("");
  const [seasonNotice, setSeasonNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showCreateSeasonModal, setShowCreateSeasonModal] = useState(false);
  const [creatingSeason, setCreatingSeason] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState("");
  const [newSeasonStartDate, setNewSeasonStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [copyDriversToNewSeason, setCopyDriversToNewSeason] = useState(true);
  const [showDeleteSeasonModal, setShowDeleteSeasonModal] = useState(false);
  const [deletingSeason, setDeletingSeason] = useState(false);

  // Load league detail
  useEffect(() => {
    api.leagues
      .get(leagueId)
      .then((data) => {
        setLeague(data);
        // Select the active season, or the last one
        const active = data.seasons.find((s) => s.isActive);
        const season = active || data.seasons[data.seasons.length - 1];
        if (season) {
          setSelectedSeasonId(season.id);
        }
      })
      .catch((err) => {
        if (err.status === 404) {
          notFound();
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [leagueId]);

  // Load drivers + races when season changes
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
      // Season data failed — show empty
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
      const message =
        err instanceof Error ? err.message : "Failed to load access settings";
      setAccessError(message);
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
      ...(newInviteMaxUses.trim()
        ? { maxUses: Number.parseInt(newInviteMaxUses.trim(), 10) }
        : {}),
      ...(newInviteExpiresAt
        ? { expiresAt: new Date(newInviteExpiresAt).toISOString() }
        : {}),
    };

    try {
      await api.leagues.inviteCodes.create(leagueId, payload);
      setNewInviteMaxUses("");
      setNewInviteExpiresAt("");
      await loadAccessData();
      setAccessNotice({ type: "success", message: t("league.codeCreated") });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create invite code";
      setAccessNotice({ type: "error", message });
    }
  };

  const rotateInviteCode = async () => {
    const payload: CreateInviteCodeInput = {
      roleToGrant: newInviteRole,
      ...(newInviteMaxUses.trim()
        ? { maxUses: Number.parseInt(newInviteMaxUses.trim(), 10) }
        : {}),
      ...(newInviteExpiresAt
        ? { expiresAt: new Date(newInviteExpiresAt).toISOString() }
        : {}),
    };

    try {
      await api.leagues.inviteCodes.rotate(leagueId, payload);
      await loadAccessData();
      setAccessNotice({
        type: "success",
        message: t("league.codeRotated"),
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to rotate invite code";
      setAccessNotice({ type: "error", message });
    }
  };

  const deactivateInviteCode = async (inviteId: string) => {
    try {
      await api.leagues.inviteCodes.deactivate(leagueId, inviteId);
      await loadAccessData();
      setAccessNotice({ type: "success", message: t("league.codeDeactivated") });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to deactivate invite code";
      setAccessNotice({ type: "error", message });
    }
  };

  const updateMemberRole = async (
    memberId: string,
    role: "admin" | "member",
  ) => {
    try {
      await api.leagues.members.updateRole(leagueId, memberId, { role });
      await loadAccessData();
      setAccessNotice({
        type: "success",
        message: `${t("league.memberRoleSet")} ${role}.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update role";
      setAccessNotice({ type: "error", message });
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      await api.leagues.members.remove(leagueId, memberId);
      await loadAccessData();
      setAccessNotice({
        type: "success",
        message: t("league.memberRemoved"),
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to remove member";
      setAccessNotice({ type: "error", message });
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
  const sortedDrivers = [...drivers].sort(
    (a, b) => b.totalPoints - a.totalPoints,
  );

  const openCreateSeasonModal = () => {
    const nextNumber = league.seasons.length + 1;
    setNewSeasonName(`Season ${nextNumber}`);
    setNewSeasonStartDate(new Date().toISOString().split("T")[0]);
    setCopyDriversToNewSeason(true);
    setShowCreateSeasonModal(true);
  };

  const handleCreateSeason = async () => {
    if (!newSeasonName.trim() || !newSeasonStartDate) {
      setSeasonNotice({
        type: "error",
        message: t("season.nameRequired"),
      });
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
      // Reload league to get updated seasons
      const updated = await api.leagues.get(leagueId);
      setLeague(updated);
      const newSeason =
        updated.seasons.find((s) => s.isActive) ||
        updated.seasons[updated.seasons.length - 1];
      if (newSeason) setSelectedSeasonId(newSeason.id);
      setShowCreateSeasonModal(false);
      await loadSeasonData();
      setSeasonNotice({
        type: "success",
        message: copyDriversToNewSeason
          ? t("season.createdWithDrivers")
          : t("season.created"),
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("season.createFailed");
      setSeasonNotice({ type: "error", message });
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
        updated.seasons.find((season) => season.isActive) ||
        updated.seasons[updated.seasons.length - 1];

      if (nextSeason) {
        setSelectedSeasonId(nextSeason.id);
      }

      await loadSeasonData();
      setShowDeleteSeasonModal(false);
      setSeasonNotice({ type: "success", message: t("season.deleted") });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("season.deleteFailed");
      setSeasonNotice({ type: "error", message });
    } finally {
      setDeletingSeason(false);
    }
  };

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
            <p className="text-[var(--color-muted)] mt-1 text-sm sm:text-base">
              {league.description}
            </p>
          </div>
          <div className="flex flex-row sm:flex-col gap-2 shrink-0">
            {canManageLeague && (
              <>
                <Button
                  href={`/liga/${leagueId}/edit`}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <Edit className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t("league.edit")}</span>
                  <span className="sm:hidden">{t("league.editShort")}</span>
                </Button>
                <Button
                  onClick={openCreateSeasonModal}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t("league.newSeason")}</span>
                  <span className="sm:hidden">{t("league.newSeasonShort")}</span>
                </Button>
              </>
            )}
            {seasonNotice && (
              <p
                className={`text-sm ${
                  seasonNotice.type === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
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
                {season.name} ({new Date(currentSeason.startDate).getFullYear()}
                )
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

      {/* Main Content - Two Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Driver Rankings */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Medal className="w-6 h-6 text-[var(--color-primary)]" />
              {t("league.driverRankings")}
            </h2>
            {canManageLeague && (
              <Button
                href={`/liga/${leagueId}/drivers`}
                variant="outline"
                size="sm"
              >
                <Users className="w-4 h-4 mr-2" />
                {t("league.manageDrivers")}
              </Button>
            )}
          </div>

          {sortedDrivers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{t("league.position")}</TableHead>
                  <TableHead>{t("league.nameLabel")}</TableHead>
                  <TableHead className="text-right">{t("league.points")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDrivers.map((driver, index) => (
                  <TableRow
                    key={driver.id}
                    isClickable
                    onClick={() => setSelectedDriver(driver)}
                  >
                    <TableCell className="font-medium">
                      {getRankDisplay(index + 1)}
                    </TableCell>
                    <TableCell className="font-medium">
                      #{driver.number} {driver.name}
                      {driver.teamName && (
                        <span className="ml-2 text-xs text-[var(--color-muted)]">
                          ({driver.teamName})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {driver.totalPoints}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-[var(--color-muted)] text-center py-8">
              {t("league.noDrivers")}
            </p>
          )}
        </div>

        {/* Right Column - Races */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Flag className="w-6 h-6 text-[var(--color-primary)]" />
              {t("league.races")}
            </h2>
            {canManageLeague && (
              <Button href={`/liga/${leagueId}/race/new`} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                {t("league.newRace")}
              </Button>
            )}
          </div>

          {races.length > 0 ? (
            <div className="space-y-3">
              {races.map((race) => {
                const navigateToRace = () => {
                  router.push(`/liga/${leagueId}/race/${race.id}`);
                };
                return (
                  <div
                    key={race.id}
                    className="bg-white rounded-xl p-4 border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm transition-all cursor-pointer"
                    onClick={navigateToRace}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${race.name}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigateToRace();
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-[var(--foreground)]">
                          {race.name}
                        </h3>
                        <p className="text-sm text-[var(--color-muted)]">
                          {race.track}
                        </p>
                      </div>
                      <span className="text-sm text-[var(--color-muted)]">
                        {new Date(race.date).toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {race.winner && (
                      <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-[var(--color-muted)]">
                            {t("league.winner")}:
                          </span>
                          <span className="font-medium flex items-center gap-1">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            {race.winner}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[var(--color-muted)] text-center py-8">
              {t("league.noRaces")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 bg-[var(--color-card)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[var(--color-primary)]" />
            {t("league.teamRankings")}
          </h2>
        </div>

        {teamRankings.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t("league.position")}</TableHead>
                <TableHead>{t("teams.label")}</TableHead>
                <TableHead className="text-center">{t("league.racesCount")}</TableHead>
                <TableHead className="text-center">{t("league.wins")}</TableHead>
                <TableHead className="text-right">{t("league.points")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamRankings.map((team, index) => (
                <TableRow key={team.teamId}>
                  <TableCell className="font-medium">
                    {getRankDisplay(index + 1)}
                  </TableCell>
                  <TableCell className="font-medium">{team.teamName}</TableCell>
                  <TableCell className="text-center">
                    {team.raceEntries}
                  </TableCell>
                  <TableCell className="text-center">{team.wins}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {team.points}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-[var(--color-muted)] text-center py-6">
            {t("league.noTeamPoints")}
          </p>
        )}
      </div>

      {canManageLeague && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <div className="bg-[var(--color-card)] rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2 mb-3">
              <Share2 className="w-5 h-5 text-[var(--color-primary)]" />
              {t("league.inviteCodes")}
            </h2>
            <p className="text-sm text-[var(--color-muted)] mb-4">
              {t("league.inviteCodesDesc")}
            </p>

            {accessNotice && (
              <p
                className={`text-sm mb-3 ${
                  accessNotice.type === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {accessNotice.message}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  {t("league.roleLabel")}
                </label>
                <select
                  value={newInviteRole}
                  onChange={(e) =>
                    setNewInviteRole(e.target.value as "admin" | "member")
                  }
                  className="w-full bg-white border border-[var(--color-border)] rounded-lg px-3 py-2"
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <Input
                label={t("league.maxUsesLabel")}
                value={newInviteMaxUses}
                onChange={(e) => setNewInviteMaxUses(e.target.value)}
                placeholder="e.g. 10"
              />

              <Input
                label={t("league.expiresLabel")}
                type="datetime-local"
                value={newInviteExpiresAt}
                onChange={(e) => setNewInviteExpiresAt(e.target.value)}
              />

              <div className="flex items-end">
                <Button
                  onClick={rotateInviteCode}
                  variant="secondary"
                  className="w-full"
                >
                  {t("league.rotateCode")}
                </Button>
              </div>

              <div className="flex items-end">
                <Button onClick={createInviteCode} className="w-full">
                  {t("league.createCode")}
                </Button>
              </div>
            </div>

            {accessLoading ? (
              <p className="text-sm text-[var(--color-muted)]">{t("common.loading")}</p>
            ) : invites.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">
                {t("league.noInviteCodes")}
              </p>
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
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  invite.code,
                                );
                                setAccessNotice({
                                  type: "success",
                                  message: t("league.codeCopied"),
                                });
                              } catch {
                                setAccessNotice({
                                  type: "error",
                                  message: t("league.copyFailed"),
                                });
                              }
                            }}
                          >
                            {t("league.copyCode")}
                          </Button>
                          {invite.isActive ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deactivateInviteCode(invite.id)}
                            >
                              {t("league.deactivateCode")}
                            </Button>
                          ) : (
                            <span className="text-sm text-[var(--color-muted)]">
                              —
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="bg-[var(--color-card)] rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-[var(--color-primary)]" />
              {t("league.membersRoles")}
            </h2>
            <p className="text-sm text-[var(--color-muted)] mb-4">
              {t("league.membersRolesDesc")}
            </p>

            {accessLoading ? (
              <p className="text-sm text-[var(--color-muted)]">{t("common.loading")}</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">
                {t("league.noMembers")}
              </p>
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
                            <span className="text-sm text-[var(--color-muted)]">
                              {t("league.ownerLabel")}
                            </span>
                          ) : member.role === "member" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateMemberRole(member.membershipId, "admin")
                              }
                            >
                              {t("league.makeAdmin")}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                updateMemberRole(member.membershipId, "member")
                              }
                            >
                              {t("league.removeAdmin")}
                            </Button>
                          )}

                          {member.role !== "owner" &&
                            member.userId !== currentUserId && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  removeMember(member.membershipId)
                                }
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
            {accessError && (
              <p className="text-sm text-red-600 mt-3">{accessError}</p>
            )}
          </div>
        </div>
      )}

      {canManageLeague && (
        <>
          <Modal
            isOpen={showCreateSeasonModal}
            onClose={() => {
              if (!creatingSeason) setShowCreateSeasonModal(false);
            }}
            title={t("season.create")}
            footer={
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowCreateSeasonModal(false)}
                  disabled={creatingSeason}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  className="w-full"
                  onClick={handleCreateSeason}
                  disabled={creatingSeason}
                >
                  {creatingSeason ? t("season.creating") : t("season.create")}
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <Input
                label={t("season.nameLabel")}
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                placeholder={t("season.namePlaceholder")}
              />
              <Input
                label={t("season.startDate")}
                type="date"
                value={newSeasonStartDate}
                onChange={(e) => setNewSeasonStartDate(e.target.value)}
              />
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
            onClose={() => {
              if (!deletingSeason) setShowDeleteSeasonModal(false);
            }}
            title={t("season.delete")}
            footer={
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowDeleteSeasonModal(false)}
                  disabled={deletingSeason}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  className="w-full"
                  onClick={handleDeleteSeason}
                  disabled={deletingSeason || league.seasons.length <= 1}
                >
                  {deletingSeason ? t("season.deleting") : t("season.delete")}
                </Button>
              </div>
            }
          >
            <p className="text-sm text-[var(--color-muted)]">
              {t("season.deleteConfirm")}
            </p>
          </Modal>
        </>
      )}

      <Modal
        isOpen={!!selectedDriver}
        onClose={() => setSelectedDriver(null)}
        title={selectedDriver?.name || ""}
        footer={
          <Button onClick={() => setSelectedDriver(null)} className="w-full">
            {t("common.close")}
          </Button>
        }
      >
        {selectedDriver && (
          <DriverStats driver={selectedDriver} t={t} locale={locale} />
        )}
      </Modal>
    </div>
  );
}
