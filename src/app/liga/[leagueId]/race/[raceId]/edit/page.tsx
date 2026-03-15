"use client";

import { useState, useEffect, useId } from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import Button from "@/components/Button";
import RaceForm from "@/components/RaceForm";
import { normalizeTracks } from "@/lib/normalize";
import { api } from "@/lib/api";
import type { RaceResultEntry } from "@/components/RaceForm";
import type { LeagueDetailDTO, DriverDTO } from "@/server/domain/dto";

export default function EditRacePage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const raceId = params.raceId as string;
  const baseId = useId();

  const [league, setLeague] = useState<LeagueDetailDTO | null>(null);
  const [allDrivers, setAllDrivers] = useState<DriverDTO[]>([]);
  const [seasonId, setSeasonId] = useState<string>("");
  const [initialData, setInitialData] = useState<{
    raceName: string;
    track: string;
    customTrack: string;
    date: string;
    results: RaceResultEntry[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.leagues.get(leagueId), api.races.get(leagueId, raceId)])
      .then(async ([leagueData, raceData]) => {
        if (leagueData.currentUserRole === "member") {
          setPageError("Insufficient permissions");
          return;
        }

        const leagueTracks = normalizeTracks(leagueData.tracks);
        setLeague(leagueData);

        const isKnownTrack = leagueTracks.includes(raceData.track);
        const initialTrack = isKnownTrack ? raceData.track : "__custom__";
        const initialCustomTrack = isKnownTrack ? "" : raceData.track;

        const results: RaceResultEntry[] = raceData.results.map((r, index) => ({
          id: `${baseId}-result-${index}`,
          driverId: r.driverId,
          position: r.position,
          lapTime: r.lapTime || "",
          fastestLap: r.fastestLap,
          dnf: r.dnf,
          penalties: r.penalties.map((p) => ({
            id: p.id,
            type: p.type,
            value: p.value,
            note: p.note || "",
          })),
        }));

        setInitialData({
          raceName: raceData.name,
          track: initialTrack,
          customTrack: initialCustomTrack,
          date: raceData.date,
          results,
        });

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
  }, [leagueId, raceId, baseId]);

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (pageError || !league || !initialData) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-600 mb-4">Failed to load race: {pageError}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Button href={`/liga/${leagueId}/race/${raceId}`} variant="secondary" size="sm" className="mb-4">
          ← Back to Race
        </Button>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Edit Race</h1>
        <p className="text-[var(--color-muted)] mt-1">Update race details and results</p>
      </div>

      <RaceForm
        mode="edit"
        leagueId={leagueId}
        seasonId={seasonId}
        raceId={raceId}
        league={league}
        allDrivers={allDrivers}
        initialRaceName={initialData.raceName}
        initialTrack={initialData.track}
        initialCustomTrack={initialData.customTrack}
        initialDate={initialData.date}
        initialResults={initialData.results}
      />
    </div>
  );
}
