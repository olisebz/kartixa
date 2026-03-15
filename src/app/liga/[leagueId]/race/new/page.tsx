"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import Button from "@/components/Button";
import RaceForm from "@/components/RaceForm";
import { api } from "@/lib/api";
import { useLocale } from "@/LocaleContext";
import type { LeagueDetailDTO, DriverDTO } from "@/server/domain/dto";

export default function NewRacePage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const { t } = useLocale();

  const [league, setLeague] = useState<LeagueDetailDTO | null>(null);
  const [allDrivers, setAllDrivers] = useState<DriverDTO[]>([]);
  const [seasonId, setSeasonId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    api.leagues
      .get(leagueId)
      .then(async (leagueData) => {
        if (leagueData.currentUserRole === "member") {
          setPageError(t("common.insufficientPermissions"));
          return;
        }
        setLeague(leagueData);
        const activeSeason =
          leagueData.seasons.find((s) => s.isActive) ||
          leagueData.seasons[leagueData.seasons.length - 1];
        if (activeSeason) {
          setSeasonId(activeSeason.id);
          const driversData = await api.drivers.list(leagueId, activeSeason.id);
          setAllDrivers(driversData);
        }
      })
      .catch((err) => {
        if (err.status === 404) notFound();
        setPageError(err.message);
      })
      .finally(() => setLoading(false));
  }, [leagueId, t]);

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (pageError || !league) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-600 mb-4">
          {t("common.failedLoad")}: {pageError}
        </p>
        <Button onClick={() => window.location.reload()}>{t("common.retry")}</Button>
      </div>
    );
  }

  return (
    <div className="py-4 sm:py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Button href={`/liga/${leagueId}`} variant="secondary" size="sm" className="mb-4">
          {t("newRace.backToLeague")}
        </Button>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">{t("newRace.title")}</h1>
        <p className="text-[var(--color-muted)] mt-1">{t("newRace.subtitle")}</p>
      </div>

      <RaceForm
        mode="create"
        leagueId={leagueId}
        seasonId={seasonId}
        league={league}
        allDrivers={allDrivers}
      />
    </div>
  );
}
