"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import Button from "@/components/Button";
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

// Medal lookup for rankings
const medalIcons: Record<number, string> = {
  1: "🥇 ",
  2: "🥈 ",
  3: "🥉 ",
};

function getRankDisplay(rank: number): string {
  return medalIcons[rank] || String(rank);
}

// Driver Profile Modal
function DriverModal({
  driver,
  onClose,
}: {
  driver: Driver;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus management and scroll prevention
  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement;
    modalRef.current?.focus();
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
      previousActiveElement?.focus();
    };
  }, []);

  // Handle Escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="driver-modal-title"
      tabIndex={-1}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2
            id="driver-modal-title"
            className="text-2xl font-bold text-[var(--foreground)]"
          >
            {driver.name}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-[var(--foreground)] text-2xl"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-[var(--color-primary)]">
                {driver.totalPoints}
              </div>
              <div className="text-sm text-[var(--color-muted)]">
                Total Points
              </div>
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

        <Button onClick={onClose} className="w-full mt-6">
          Close
        </Button>
      </div>
    </div>
  );
}

export default function LeagueDetailPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const league = getLeagueById(leagueId);

  if (!league) {
    notFound();
  }

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const sortedDrivers = useMemo(
    () => getSortedRankings(league.drivers),
    [league.drivers]
  );

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <Button href="/liga" variant="secondary" size="sm" className="mb-4">
          ← Back to Leagues
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              {league.name}
            </h1>
            <p className="text-[var(--color-muted)] mt-1">
              {league.description}
            </p>
          </div>
          <Button variant="outline">Edit League</Button>
        </div>
      </div>

      {/* Main Content - Two Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Driver Rankings */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              Driver Rankings
            </h2>
            <Button variant="outline" size="sm">
              Add Driver
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

          {league.races.length > 0 ? (
            <div className="space-y-3">
              {league.races.map((race) => (
                <div
                  key={race.id}
                  className="bg-white rounded-xl p-4 border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => {
                    // TODO: Navigate to race detail page
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${race.name}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      // TODO: Navigate to race detail page
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
              ))}
            </div>
          ) : (
            <p className="text-[var(--color-muted)] text-center py-8">
              No races yet. Create your first race!
            </p>
          )}
        </div>
      </div>

      {/* Driver Modal */}
      {selectedDriver && (
        <DriverModal
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </div>
  );
}
