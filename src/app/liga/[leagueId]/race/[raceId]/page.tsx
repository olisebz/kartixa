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
import { useLocale } from "@/LocaleContext";
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
  const { t, locale } = useLocale();

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
        <p className="text-red-600 mb-4">{t("common.failedLoad")}: {error}</p>
        <Button onClick={() => window.location.reload()}>{t("common.retry")}</Button>
      </div>
    );
  }

  // Sort results by position
  const sortedResults = [...race.results].sort(
    (a, b) => a.position - b.position,
  );

  // Find fastest lap driver
  const fastestLapDriver = race.results.find((r) => r.fastestLap);

  const dateLocale = locale === "de" ? "de-DE" : "en-US";

  return (
    <div className="py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          href={`/liga/${leagueId}`}
          variant="secondary"
          size="sm"
          className="mb-4"
        >
          ← Back to {league.name}
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] truncate">
              {race.name}
            </h1>
            <p className="text-[var(--color-muted)] mt-1 text-sm sm:text-base">
              {race.track} •{" "}
              {new Date(race.date).toLocaleDateString(dateLocale, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <Button
            href={`/liga/${leagueId}/race/${raceId}/edit`}
            variant="outline"
            size="sm"
            className="shrink-0 self-start sm:self-auto"
          >
            <Edit className="w-4 h-4 mr-2" />
            {t("race.edit")}
          </Button>
        </div>
      </div>

      {/* Race Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <UsersIcon className="w-5 h-5 mx-auto mb-2 text-[var(--color-primary)]" />
          <div className="text-2xl font-bold text-[var(--color-primary)]">
            {race.results.length}
          </div>
          <div className="text-xs text-[var(--color-muted)]">{t("race.participants")}</div>
        </div>
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <Trophy className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
          <div className="text-sm font-semibold text-[var(--foreground)] truncate">
            {sortedResults[0]?.driverName || "N/A"}
          </div>
          <div className="text-xs text-[var(--color-muted)]">{t("race.winner")}</div>
        </div>
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <Award className="w-5 h-5 mx-auto mb-2 text-[var(--color-primary)]" />
          <div className="text-2xl font-bold text-[var(--color-primary)]">
            {race.results.reduce((sum, r) => sum + r.points, 0)}
          </div>
          <div className="text-xs text-[var(--color-muted)]">{t("race.totalPoints")}</div>
        </div>
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <Zap className="w-5 h-5 mx-auto mb-2 text-purple-500" />
          <div className="text-sm font-semibold text-[var(--foreground)] truncate">
            {fastestLapDriver?.driverName || "N/A"}
          </div>
          <div className="text-xs text-[var(--color-muted)]">{t("race.fastestLap")}</div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-[var(--color-card)] rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-[var(--color-primary)]" />
          {t("race.raceResults")}
        </h2>

        {sortedResults.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t("race.position")}</TableHead>
                <TableHead>{t("race.driver")}</TableHead>
                <TableHead className="text-right">{t("race.lapTime")}</TableHead>
                <TableHead className="text-right">{t("race.pts")}</TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("penalties.column")}
                </TableHead>
                <TableHead className="hidden sm:table-cell w-24 text-center">
                  {t("race.fastestLap")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedResults.map((result) => (
                <TableRow key={`${result.driverId}-${result.position}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 ${
                          result.dnf
                            ? "bg-red-600"
                            : result.position === 1
                              ? "bg-yellow-500"
                              : result.position === 2
                                ? "bg-gray-400"
                                : result.position === 3
                                  ? "bg-amber-700"
                                  : "bg-[var(--color-primary)]"
                        }`}
                      >
                        {result.dnf ? t("raceExtras.dnf") : result.position}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1">
                        {result.driverName}
                        {result.position === 1 && (
                          <Trophy className="w-4 h-4 inline-block text-yellow-500" />
                        )}
                        {result.fastestLap && !result.dnf && (
                          <Zap
                            className="w-4 h-4 inline-block text-purple-500 sm:hidden"
                            aria-label={t("race.fastestLap")}
                          />
                        )}
                      </span>
                      {result.teamName && (
                        <span className="text-xs text-[var(--color-muted)]">
                          {result.teamName}
                        </span>
                      )}
                      {result.penalties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
                          {result.penalties.map((penalty) => (
                            <span
                              key={penalty.id}
                              className="text-xs bg-red-50 border border-red-200 text-red-700 rounded px-1.5 py-0.5"
                              title={penalty.note || undefined}
                            >
                              {penalty.type === "points"
                                ? `${t("penalties.summaryPoints")} -${penalty.value}`
                                : penalty.type === "seconds"
                                  ? `${penalty.value}s`
                                  : `${t("penalties.summaryGrid")} +${penalty.value}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-[var(--color-primary)] text-sm">
                    {result.lapTime || "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {result.points}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {result.penalties.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {result.penalties.map((penalty) => (
                          <span
                            key={penalty.id}
                            className="text-xs bg-[var(--color-card)] border border-[var(--color-border)] rounded px-2 py-1"
                            title={penalty.note || undefined}
                          >
                            {penalty.type === "points"
                              ? `${t("penalties.summaryPoints")} -${penalty.value}`
                              : penalty.type === "seconds"
                                ? `${penalty.value}s`
                                : `${t("penalties.summaryGrid")} +${penalty.value}`}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[var(--color-muted)]">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-center">
                    {result.fastestLap && !result.dnf && (
                      <Zap
                        className="w-4 h-4 inline-block text-purple-500"
                        aria-label={t("race.fastestLap")}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-[var(--color-muted)] text-center py-8">
            {t("race.noResults")}
          </p>
        )}
      </div>

      {/* Podium Visual */}
      {sortedResults.length >= 3 && (
        <div className="mt-8 bg-[var(--color-card)] rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6 text-center">
            {t("race.podium")}
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
                {sortedResults[1]?.points} {t("race.pts")}
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
                {sortedResults[0]?.points} {t("race.pts")}
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
                {sortedResults[2]?.points} {t("race.pts")}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
