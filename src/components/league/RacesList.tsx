"use client";

import { useRouter } from "next/navigation";
import { Flag, Plus, Trophy } from "lucide-react";
import Button from "@/components/Button";
import type { RaceListDTO } from "@/server/domain/dto";

interface RacesListProps {
  races: RaceListDTO[];
  leagueId: string;
  canManageLeague: boolean;
  t: (key: string) => string;
  locale: "de" | "en";
}

export default function RacesList({
  races,
  leagueId,
  canManageLeague,
  t,
  locale,
}: RacesListProps) {
  const router = useRouter();

  return (
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
            const navigateToRace = () => router.push(`/liga/${leagueId}/race/${race.id}`);
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
                    <h3 className="font-semibold text-[var(--foreground)]">{race.name}</h3>
                    <p className="text-sm text-[var(--color-muted)]">{race.track}</p>
                  </div>
                  <span className="text-sm text-[var(--color-muted)]">
                    {new Date(race.date).toLocaleDateString(
                      locale === "de" ? "de-DE" : "en-US",
                      { month: "short", day: "numeric", year: "numeric" },
                    )}
                  </span>
                </div>
                {race.winner && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[var(--color-muted)]">{t("league.winner")}:</span>
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
        <p className="text-[var(--color-muted)] text-center py-8">{t("league.noRaces")}</p>
      )}
    </div>
  );
}
