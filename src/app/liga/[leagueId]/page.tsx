"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
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
import { getLeagueById, getSortedRankings } from "@/lib/mockData";
import type { Driver } from "@/lib/mockData";

const MEDAL_ICONS: Record<number, string> = {
  1: "🥇 ",
  2: "🥈 ",
  3: "🥉 ",
};

function getRankDisplay(rank: number): string {
  return MEDAL_ICONS[rank] || String(rank);
}

function DriverStats({ driver }: { driver: Driver }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-[var(--color-primary)]">
            {driver.totalPoints}
          </div>
          <div className="text-sm text-[var(--color-muted)]">Total Points</div>
        </div>
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-[var(--color-primary)]">
            {driver.wins}
          </div>
          <div className="text-sm text-[var(--color-muted)]">Wins</div>
        </div>
      </div>

      <div className="bg-[var(--color-card)] rounded-xl p-4">
        <div className="flex justify-between items-center">
          <span className="text-[var(--color-muted)]">Races Started</span>
          <span className="font-semibold">{driver.races}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-[var(--color-muted)]">Win Rate</span>
          <span className="font-semibold">
            {driver.races > 0
              ? `${Math.round((driver.wins / driver.races) * 100)}%`
              : "0%"}
          </span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-[var(--color-muted)]">Avg Points/Race</span>
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
  const league = getLeagueById(leagueId);

  // Initialize state with the most recent season (assuming last in array is newest)
  // In a real app, you might want to sort by startDate or use an 'isActive' flag
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(
    league?.seasons[league.seasons.length - 1]?.id || ""
  );

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  if (!league) {
    notFound();
  }

  const currentSeason = league.seasons.find((s) => s.id === selectedSeasonId);

  const sortedDrivers = useMemo(
    () => (currentSeason ? getSortedRankings(currentSeason.drivers) : []),
    [currentSeason]
  );

  const handleCreateSeason = () => {
    // In a real app, this would be an API call
    // For now, we'll just alert the user as we can't easily mutate the mock data 
    // consistently across re-renders without a proper state management or backend
    alert("This would create a new season starting with 0 points for all drivers!");
  };

  if (!currentSeason) {
    return <div className="p-8 text-center">Season not found</div>
  }

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
              Edit League
            </Button>
            <Button onClick={handleCreateSeason} size="sm">
              Start New Season
            </Button>
          </div>

        </div>
      </div>

      {/* Season Selector */}
      <div className="mb-8 flex items-center gap-4">
        <label htmlFor="season-select" className="font-medium text-[var(--foreground)]">
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

      {/* Main Content - Two Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Driver Rankings */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              Driver Rankings
            </h2>
            <Button
              href={`/liga/${leagueId}/drivers`}
              variant="outline"
              size="sm"
            >
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
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              Races
            </h2>
            <Button href={`/liga/${leagueId}/race/new`} size="sm">
              New Race
            </Button>
          </div>

          {currentSeason.races.length > 0 ? (
            <div className="space-y-3">
              {currentSeason.races.map((race) => {
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
                    {race.results.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-[var(--color-muted)]">
                            Winner:
                          </span>
                          <span className="font-medium">
                            🏆 {race.results[0].driverName}
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
