"use client";

import { Medal, Target, Trophy, Flag, TrendingUp, Award } from "lucide-react";
import Button from "@/components/Button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/Table";
import Modal from "@/components/Modal";
import type { DriverDTO } from "@/server/domain/dto";

const MEDAL_ICONS: Record<number, string> = { 1: "🥇 ", 2: "🥈 ", 3: "🥉 " };

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
          <div className="text-3xl font-bold text-[var(--color-primary)]">{driver.totalPoints}</div>
          <div className="text-sm text-[var(--color-muted)]">Total Points</div>
        </div>
        <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
          <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
          <div className="text-3xl font-bold text-[var(--color-primary)]">{driver.wins}</div>
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
            {driver.races > 0 ? `${Math.round((driver.wins / driver.races) * 100)}%` : "0%"}
          </span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-[var(--color-muted)] flex items-center gap-2">
            <Award className="w-4 h-4" />
            Avg Points/Race
          </span>
          <span className="font-semibold">
            {driver.races > 0 ? (driver.totalPoints / driver.races).toFixed(1) : "0"}
          </span>
        </div>
      </div>

      <div className="bg-[var(--color-card)] rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[var(--color-muted)]">{t("penalties.history")}</span>
          <span className="font-semibold">{driver.penaltiesHistory.length}</span>
        </div>
        {driver.penaltiesHistory.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">{t("penalties.noneSeason")}</p>
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

interface DriverRankingsProps {
  drivers: DriverDTO[];
  leagueId: string;
  canManageLeague: boolean;
  selectedDriver: DriverDTO | null;
  onSelectDriver: (driver: DriverDTO | null) => void;
  t: (key: string) => string;
  locale: "de" | "en";
}

export default function DriverRankings({
  drivers,
  leagueId,
  canManageLeague,
  selectedDriver,
  onSelectDriver,
  t,
  locale,
}: DriverRankingsProps) {
  const sortedDrivers = [...drivers].sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <>
      <div className="bg-[var(--color-card)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Medal className="w-6 h-6 text-[var(--color-primary)]" />
            {t("league.driverRankings")}
          </h2>
          {canManageLeague && (
            <Button href={`/liga/${leagueId}/drivers`} variant="outline" size="sm">
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
                <TableRow key={driver.id} isClickable onClick={() => onSelectDriver(driver)}>
                  <TableCell className="font-medium">{getRankDisplay(index + 1)}</TableCell>
                  <TableCell className="font-medium">
                    #{driver.number} {driver.name}
                    {driver.teamName && (
                      <span className="ml-2 text-xs text-[var(--color-muted)]">
                        ({driver.teamName})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{driver.totalPoints}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-[var(--color-muted)] text-center py-8">{t("league.noDrivers")}</p>
        )}
      </div>

      <Modal
        isOpen={!!selectedDriver}
        onClose={() => onSelectDriver(null)}
        title={selectedDriver?.name || ""}
        footer={
          <Button onClick={() => onSelectDriver(null)} className="w-full">
            {t("common.close")}
          </Button>
        }
      >
        {selectedDriver && (
          <DriverStats driver={selectedDriver} t={t} locale={locale} />
        )}
      </Modal>
    </>
  );
}
