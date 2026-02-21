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
} from "lucide-react";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/Table";
import { api } from "@/lib/api";
import type {
  LeagueDetailDTO,
  DriverDTO,
  RaceListDTO,
  SeasonDTO,
} from "@/server/domain/dto";

const MEDAL_ICONS: Record<number, string> = {
  1: "🥇 ",
  2: "🥈 ",
  3: "🥉 ",
};

function getRankDisplay(rank: number): string {
  return MEDAL_ICONS[rank] || String(rank);
}

function DriverStats({ driver }: { driver: DriverDTO }) {
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
    </div>
  );
}

export default function LeagueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leagueId = params.leagueId as string;

  const [league, setLeague] = useState<LeagueDetailDTO | null>(null);
  const [drivers, setDrivers] = useState<DriverDTO[]>([]);
  const [races, setRaces] = useState<RaceListDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [selectedDriver, setSelectedDriver] = useState<DriverDTO | null>(null);

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
      const [driversData, racesData] = await Promise.all([
        api.drivers.list(leagueId, selectedSeasonId),
        api.races.list(leagueId, selectedSeasonId),
      ]);
      setDrivers(driversData);
      setRaces(racesData);
    } catch {
      // Season data failed — show empty
      setDrivers([]);
      setRaces([]);
    }
  }, [leagueId, selectedSeasonId]);

  useEffect(() => {
    loadSeasonData();
  }, [loadSeasonData]);

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
        <p className="text-red-600 mb-4">Failed to load league: {error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const currentSeason = league.seasons.find((s) => s.id === selectedSeasonId);
  const sortedDrivers = [...drivers].sort(
    (a, b) => b.totalPoints - a.totalPoints,
  );

  const handleCreateSeason = async () => {
    const nextNumber = league.seasons.length + 1;
    const today = new Date().toISOString().split("T")[0];
    try {
      await api.seasons.create(leagueId, {
        name: `Season ${nextNumber}`,
        startDate: today,
      });
      // Reload league to get updated seasons
      const updated = await api.leagues.get(leagueId);
      setLeague(updated);
      const newSeason =
        updated.seasons.find((s) => s.isActive) ||
        updated.seasons[updated.seasons.length - 1];
      if (newSeason) setSelectedSeasonId(newSeason.id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create season";
      alert(message);
    }
  };

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <Button href="/liga" variant="secondary" size="sm" className="mb-4">
          ← Back to Leagues
        </Button>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              {league.name}
            </h1>
            <p className="text-[var(--color-muted)] mt-1">
              {league.description}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button href={`/liga/${leagueId}/edit`} variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit League
            </Button>
            <Button onClick={handleCreateSeason} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Start New Season
            </Button>
          </div>
        </div>
      </div>

      {/* Season Selector */}
      {league.seasons.length > 0 && currentSeason && (
        <div className="mb-8 flex items-center gap-4">
          <label
            htmlFor="season-select"
            className="font-medium text-[var(--foreground)] flex items-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Season:
          </label>
          <select
            id="season-select"
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--foreground)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            {league.seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>
          <span className="text-sm text-[var(--color-muted)]">
            {new Date(currentSeason.startDate).getFullYear()}
          </span>
        </div>
      )}

      {/* Main Content - Two Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Driver Rankings */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Medal className="w-6 h-6 text-[var(--color-primary)]" />
              Driver Rankings
            </h2>
            <Button
              href={`/liga/${leagueId}/drivers`}
              variant="outline"
              size="sm"
            >
              <Users className="w-4 h-4 mr-2" />
              Manage Drivers
            </Button>
          </div>

          {sortedDrivers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Points</TableHead>
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
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {driver.totalPoints}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-[var(--color-muted)] text-center py-8">
              No drivers yet. Add your first driver!
            </p>
          )}
        </div>

        {/* Right Column - Races */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Flag className="w-6 h-6 text-[var(--color-primary)]" />
              Races
            </h2>
            <Button href={`/liga/${leagueId}/race/new`} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Race
            </Button>
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
                        {new Date(race.date).toLocaleDateString("en-US", {
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
                            Winner:
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
              No races yet. Create your first race!
            </p>
          )}
        </div>
      </div>

      <Modal
        isOpen={!!selectedDriver}
        onClose={() => setSelectedDriver(null)}
        title={selectedDriver?.name || ""}
        footer={
          <Button onClick={() => setSelectedDriver(null)} className="w-full">
            Close
          </Button>
        }
      >
        {selectedDriver && <DriverStats driver={selectedDriver} />}
      </Modal>
    </div>
  );
}
