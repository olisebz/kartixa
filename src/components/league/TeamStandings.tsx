"use client";

import { Trophy } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/Table";
import type { TeamRankingDTO } from "@/server/domain/dto";

const MEDAL_ICONS: Record<number, string> = { 1: "🥇 ", 2: "🥈 ", 3: "🥉 " };

function getRankDisplay(rank: number): string {
  return MEDAL_ICONS[rank] || String(rank);
}

interface TeamStandingsProps {
  teamRankings: TeamRankingDTO[];
  t: (key: string) => string;
}

export default function TeamStandings({ teamRankings, t }: TeamStandingsProps) {
  return (
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
                <TableCell className="font-medium">{getRankDisplay(index + 1)}</TableCell>
                <TableCell className="font-medium">{team.teamName}</TableCell>
                <TableCell className="text-center">{team.raceEntries}</TableCell>
                <TableCell className="text-center">{team.wins}</TableCell>
                <TableCell className="text-right font-semibold">{team.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-[var(--color-muted)] text-center py-6">{t("league.noTeamPoints")}</p>
      )}
    </div>
  );
}
