"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import {
  Trophy,
  Zap,
  Users as UsersIcon,
  Award,
  Edit,
  Loader2,
} from "lucide-react";
import Button from "@/components/Button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/Table";
import { api } from "@/lib/api";
import type { LeagueDetailDTO, RaceDetailDTO } from "@/server/domain/dto";

export default function RaceDetailPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const raceId = params.raceId as string;

  const [league, setLeague] = useState<LeagueDetailDTO | null>(null);
  const [race, setRace] = useState<RaceDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.leagues.get(leagueId), api.races.get(leagueId, raceId)])
      .then(([leagueData, raceData]) => {
        setLeague(leagueData);
        setRace(raceData);
      })
      .catch((err) => {
        if (err.status === 404) {
          notFound();
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [leagueId, raceId]);

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (error || !league || !race) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-600 mb-4">Failed to load race: {error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // Sort results by position
  const sortedResults = [...race.results].sort(
    (a, b) => a.position - b.position,
  );

  // Find fastest lap driver
  const fastestLapDriver = race.results.find((r) => r.fastestLap);

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          href={`/liga/${leagueId}`}
          variant="secondary"
          size="sm"
          className="mb-4"
        >
          ← Back to {league.name}
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              {race.name}
            </h1>
            <p className="text-[var(--color-muted)] mt-1">
              {race.track} •{" "}
              {new Date(race.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Button
            href={`/liga/${leagueId}/race/${raceId}/edit`}
            variant="outline"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Race
          </Button>
        </div>
      </div>

      {/* Race Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <UsersIcon className="w-6 h-6 mx-auto mb-2 text-[var(--color-primary)]" />
          <div className="text-3xl font-bold text-[var(--color-primary)]">
            {race.results.length}
          </div>
          <div className="text-sm text-[var(--color-muted)]">Participants</div>
        </div>
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <Trophy className="w-8 h-8 mx-auto text-yellow-500" />
          <div className="text-sm text-[var(--color-muted)]">
            {sortedResults[0]?.driverName || "N/A"}
          </div>
        </div>
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <Award className="w-6 h-6 mx-auto mb-2 text-[var(--color-primary)]" />
          <div className="text-3xl font-bold text-[var(--color-primary)]">
            {race.results.reduce((sum, r) => sum + r.points, 0)}
          </div>
          <div className="text-sm text-[var(--color-muted)]">Total Points</div>
        </div>
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <Zap className="w-8 h-8 mx-auto text-purple-500" />
          <div className="text-sm text-[var(--color-muted)]">
            {fastestLapDriver?.driverName || "N/A"}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-[var(--color-card)] rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-[var(--color-primary)]" />
          Race Results
        </h2>

        {sortedResults.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Position</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead className="text-right">Lap Time</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="w-24 text-center">Fastest Lap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedResults.map((result) => (
                <TableRow key={result.driverId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                          result.position === 1
                            ? "bg-yellow-500"
                            : result.position === 2
                              ? "bg-gray-400"
                              : result.position === 3
                                ? "bg-amber-700"
                                : "bg-[var(--color-primary)]"
                        }`}
                      >
                        {result.position}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {result.driverName}
                    {result.position === 1 && (
                      <Trophy className="w-4 h-4 inline-block ml-2 text-yellow-500" />
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[var(--color-primary)]">
                    {result.lapTime || "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {result.points}
                  </TableCell>
                  <TableCell className="text-center">
                    {result.fastestLap && (
                      <Zap
                        className="w-4 h-4 inline-block text-[var(--color-primary)]"
                        aria-label="Fastest Lap"
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-[var(--color-muted)] text-center py-8">
            No results recorded for this race.
          </p>
        )}
      </div>

      {/* Podium Visual */}
      {sortedResults.length >= 3 && (
        <div className="mt-8 bg-[var(--color-card)] rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6 text-center">
            Podium
          </h2>
          <div className="flex items-end justify-center gap-4">
            {/* 2nd Place */}
            <div className="text-center">
              <div className="text-4xl mb-2">🥈</div>
              <div className="bg-gray-400 text-white rounded-t-lg px-6 py-8 font-bold">
                2nd
              </div>
              <div className="bg-gray-500 text-white px-4 py-2 text-sm">
                {sortedResults[1]?.driverName}
              </div>
              <div className="text-sm text-[var(--color-muted)] mt-1">
                {sortedResults[1]?.points} pts
              </div>
            </div>
            {/* 1st Place */}
            <div className="text-center">
              <div className="text-5xl mb-2">🥇</div>
              <div className="bg-yellow-500 text-white rounded-t-lg px-8 py-12 font-bold">
                1st
              </div>
              <div className="bg-yellow-600 text-white px-4 py-2 text-sm">
                {sortedResults[0]?.driverName}
              </div>
              <div className="text-sm text-[var(--color-muted)] mt-1">
                {sortedResults[0]?.points} pts
              </div>
            </div>
            {/* 3rd Place */}
            <div className="text-center">
              <div className="text-4xl mb-2">🥉</div>
              <div className="bg-amber-700 text-white rounded-t-lg px-6 py-6 font-bold">
                3rd
              </div>
              <div className="bg-amber-800 text-white px-4 py-2 text-sm">
                {sortedResults[2]?.driverName}
              </div>
              <div className="text-sm text-[var(--color-muted)] mt-1">
                {sortedResults[2]?.points} pts
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
