"use client";

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
import { getLeagueById, getRaceById } from "@/lib/mockData";

export default function RaceDetailPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const raceId = params.raceId as string;

  const league = getLeagueById(leagueId);
  const race = getRaceById(leagueId, raceId);

  if (!league || !race) {
    notFound();
  }

  // Sort results by position
  const sortedResults = [...race.results].sort(
    (a, b) => a.position - b.position
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
            Edit Race
          </Button>
        </div>
      </div>

      {/* Race Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-[var(--color-primary)]">
            {race.results.length}
          </div>
          <div className="text-sm text-[var(--color-muted)]">Participants</div>
        </div>
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-yellow-500">🏆</div>
          <div className="text-sm text-[var(--color-muted)]">
            {sortedResults[0]?.driverName || "N/A"}
          </div>
        </div>
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-[var(--color-primary)]">
            {race.results.reduce((sum, r) => sum + r.points, 0)}
          </div>
          <div className="text-sm text-[var(--color-muted)]">Total Points</div>
        </div>
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-purple-500">🏎️</div>
          <div className="text-sm text-[var(--color-muted)]">
            {fastestLapDriver?.driverName || "N/A"}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-[var(--color-card)] rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
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
                    {result.position === 1 && " 🏆"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[var(--color-primary)]">
                    {result.lapTime || "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {result.points}
                  </TableCell>
                  <TableCell className="text-center">
                    {result.fastestLap && <span title="Fastest Lap">🏎️</span>}
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
