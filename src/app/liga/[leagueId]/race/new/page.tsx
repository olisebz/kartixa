"use client";

import { useState, useEffect, useId } from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import {
  Flag,
  Plus,
  X,
  Zap,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import { api } from "@/lib/api";
import {
  POINTS_SYSTEM,
  UNKNOWN_DRIVER_NAME,
  UNKNOWN_DRIVER_TOKEN,
} from "@/server/domain/constants";
import { useLocale } from "@/LocaleContext";
import type { LeagueDetailDTO, DriverDTO } from "@/server/domain/dto";

interface RaceResultEntry {
  id: string;
  driverId: string;
  position: number;
  lapTime: string;
  fastestLap: boolean;
  dnf: boolean;
  penalties: PenaltyEntry[];
}

interface PenaltyEntry {
  id: string;
  type: "seconds" | "grid" | "points";
  value: number;
  note: string;
}

function normalizeResultsWithDnf(
  results: RaceResultEntry[],
): RaceResultEntry[] {
  const finishers = results.filter((result) => !result.dnf);
  const dnfResults = results.filter((result) => result.dnf);
  return [...finishers, ...dnfResults].map((result, index) => ({
    ...result,
    position: index + 1,
  }));
}

function normalizeTracks(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((track): track is string => typeof track === "string")
    .map((track) => track.trim())
    .filter((track) => track.length > 0);
}

export default function NewRacePage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const { t } = useLocale();

  const [league, setLeague] = useState<LeagueDetailDTO | null>(null);
  const [allDrivers, setAllDrivers] = useState<DriverDTO[]>([]);
  const [seasonId, setSeasonId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const baseId = useId();
  const [resultIdCounter, setResultIdCounter] = useState(0);

  // Load league and drivers
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
        if (err.status === 404) {
          notFound();
        }
        setPageError(err.message);
      })
      .finally(() => setLoading(false));
  }, [leagueId]);

  const [raceName, setRaceName] = useState("");
  const [track, setTrack] = useState("");
  const [customTrack, setCustomTrack] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [results, setResults] = useState<RaceResultEntry[]>([]);
  const [penaltyModalResultId, setPenaltyModalResultId] = useState<
    string | null
  >(null);
  const [penaltyType, setPenaltyType] = useState<"seconds" | "grid" | "points">(
    "seconds",
  );
  const [penaltyValue, setPenaltyValue] = useState("5");
  const [penaltyNote, setPenaltyNote] = useState("");

  // Validation state
  const [errors, setErrors] = useState<{
    raceName?: string;
    track?: string;
    results?: string;
  }>({});

  // Get available drivers (not yet in results)
  const usedDriverIds = new Set(
    results
      .map((r) => r.driverId)
      .filter((driverId) => driverId !== UNKNOWN_DRIVER_TOKEN),
  );
  const availableDrivers = allDrivers.filter((d) => !usedDriverIds.has(d.id));
  const leagueTracks = normalizeTracks(league?.tracks);

  // Track options
  const trackOptions = [
    { value: "", label: t("newRace.selectTrackPlaceholder") },
    ...leagueTracks.map((t) => ({ value: t, label: t })),
    { value: "__custom__", label: "+ Add new track" },
  ];

  const addResult = () => {
    const newPosition = results.length + 1;
    setResults([
      ...results,
      {
        id: `${baseId}-result-${resultIdCounter}`,
        driverId: "",
        position: newPosition,
        lapTime: "",
        fastestLap: false,
        dnf: false,
        penalties: [],
      },
    ]);
    setResultIdCounter((c) => c + 1);
  };

  const updateResult = (
    id: string,
    field: keyof RaceResultEntry,
    value: string | number | boolean,
  ) => {
    // Ensure only one driver can have fastest lap
    if (field === "fastestLap" && value === true) {
      setResults(
        results.map((r) => ({
          ...r,
          fastestLap: r.id === id && !r.dnf,
          // Clear lap time for drivers who lose fastest lap status
          lapTime: r.id === id ? r.lapTime : "",
        })),
      );
    } else {
      setResults(
        results.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      );
    }
  };

  const removeResult = (id: string) => {
    const newResults = results.filter((r) => r.id !== id);
    setResults(normalizeResultsWithDnf(newResults));
  };

  const moveResult = (id: string, direction: "up" | "down") => {
    const index = results.findIndex((r) => r.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === results.length - 1)
    ) {
      return;
    }

    const newResults = [...results];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newResults[index], newResults[swapIndex]] = [
      newResults[swapIndex],
      newResults[index],
    ];

    setResults(normalizeResultsWithDnf(newResults));
  };

  const toggleDnf = (id: string) => {
    setResults((current) => {
      const updated = current.map((result) => {
        if (result.id !== id) {
          return result;
        }

        const nextDnf = !result.dnf;
        return {
          ...result,
          dnf: nextDnf,
          fastestLap: nextDnf ? false : result.fastestLap,
          lapTime: nextDnf ? "" : result.lapTime,
        };
      });

      return normalizeResultsWithDnf(updated);
    });
  };

  const openPenaltyModal = (resultId: string) => {
    setPenaltyModalResultId(resultId);
    setPenaltyType("seconds");
    setPenaltyValue("5");
    setPenaltyNote("");
  };

  const addPenalty = () => {
    if (!penaltyModalResultId) {
      return;
    }

    const value = Number.parseInt(penaltyValue, 10);
    if (Number.isNaN(value) || value < 1) {
      return;
    }

    setResults((current) =>
      current.map((result) => {
        if (result.id !== penaltyModalResultId) {
          return result;
        }

        return {
          ...result,
          penalties: [
            ...result.penalties,
            {
              id: `${result.id}-penalty-${Date.now()}-${result.penalties.length}`,
              type: penaltyType,
              value,
              note: penaltyNote.trim(),
            },
          ],
        };
      }),
    );

    setPenaltyModalResultId(null);
  };

  const removePenalty = (resultId: string, penaltyId: string) => {
    setResults((current) =>
      current.map((result) => {
        if (result.id !== resultId) {
          return result;
        }

        return {
          ...result,
          penalties: result.penalties.filter(
            (penalty) => penalty.id !== penaltyId,
          ),
        };
      }),
    );
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!raceName.trim()) {
      newErrors.raceName = t("newRace.errors.nameRequired");
    }

    const selectedTrack = track === "__custom__" ? customTrack : track;
    if (!selectedTrack.trim()) {
      newErrors.track = t("newRace.errors.trackRequired");
    }

    if (results.length === 0) {
      newErrors.results = t("newRace.errors.atLeastOne");
    } else if (results.some((r) => !r.driverId)) {
      newErrors.results = t("newRace.errors.driverRequired");
    } else if (results.filter((r) => r.fastestLap).length > 1) {
      newErrors.results = t("newRace.errors.fastestLapMultiple");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [submitting, setSubmitting] = useState(false);
  const [createdRaceId, setCreatedRaceId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const selectedTrack = track === "__custom__" ? customTrack : track;

    const normalizedResults = normalizeResultsWithDnf(results);

    setSubmitting(true);
    try {
      const race = await api.races.create(leagueId, seasonId, {
        name: raceName,
        track: selectedTrack,
        date,
        results: normalizedResults.map((r) => ({
          driverId: r.driverId,
          position: r.position,
          lapTime: r.lapTime || null,
          fastestLap: r.dnf ? false : r.fastestLap,
          dnf: r.dnf,
          penalties: r.penalties.map((penalty) => ({
            type: penalty.type,
            value: penalty.value,
            note: penalty.note || null,
          })),
        })),
      });
      setCreatedRaceId(race.id);
      setShowSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("newRace.failedCreate");
      setErrors({ results: message });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate points including fastest lap bonus
  const getPointsWithBonus = (position: number, hasFastestLap: boolean) => {
    const basePoints = POINTS_SYSTEM[position] || 0;
    const bonus = hasFastestLap && position <= 10 ? 1 : 0;
    return basePoints + bonus;
  };

  const getResultPointsPreview = (result: RaceResultEntry) => {
    if (result.driverId === UNKNOWN_DRIVER_TOKEN || result.dnf) {
      return 0;
    }
    const penaltyDeduction = result.penalties
      .filter((penalty) => penalty.type === "points")
      .reduce((sum, penalty) => sum + penalty.value, 0);
    return (
      getPointsWithBonus(result.position, result.fastestLap) - penaltyDeduction
    );
  };

  // Success state for Phase 1
  const [showSuccess, setShowSuccess] = useState(false);

  // Success message UI
  if (showSuccess) {
    return (
      <div className="py-4 sm:py-8 max-w-2xl mx-auto text-center">
        <div className="bg-[var(--color-card)] rounded-2xl p-8">
          <div className="mb-4 flex justify-center">
            <Flag className="w-16 h-16 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            {t("newRace.success")}
          </h1>
          <p className="text-[var(--color-muted)] mb-6">
            {t("newRace.createdMessage")}
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              href={
                createdRaceId
                  ? `/liga/${leagueId}/race/${createdRaceId}`
                  : `/liga/${leagueId}`
              }
              variant="secondary"
            >
              {t("newRace.viewRace")}
            </Button>
            <Button
              onClick={() => {
                setShowSuccess(false);
                setCreatedRaceId(null);
                setRaceName("");
                setTrack("");
                setCustomTrack("");
                setResults([]);
                setPenaltyModalResultId(null);
              }}
            >
              {t("newRace.addAnother")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
        <Button onClick={() => window.location.reload()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="py-4 sm:py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          href={`/liga/${leagueId}`}
          variant="secondary"
          size="sm"
          className="mb-4"
        >
          {t("newRace.backToLeague")}
        </Button>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          {t("newRace.title")}
        </h1>
        <p className="text-[var(--color-muted)] mt-1">
          {t("newRace.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Race Details Card */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            {t("newRace.raceDetails")}
          </h2>

          <div className="space-y-4">
            <Input
              label={t("newRace.raceName")}
              value={raceName}
              onChange={(e) => setRaceName(e.target.value)}
              placeholder={t("newRace.raceNamePlaceholder")}
              error={errors.raceName}
              required
            />

            <Select
              label={t("newRace.track")}
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              options={trackOptions}
              error={track !== "__custom__" ? errors.track : undefined}
              required
            />

            {track === "__custom__" && (
              <Input
                label={t("newRace.track")}
                value={customTrack}
                onChange={(e) => setCustomTrack(e.target.value)}
                placeholder={t("newRace.raceNamePlaceholder")}
                error={errors.track}
                required
              />
            )}

            <Input
              label={t("newRace.date")}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
        </div>

        {/* Results Card */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              {t("race.raceResults")}
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addResult}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("newRace.addPosition")}
            </Button>
          </div>

          {errors.results && (
            <p className="text-red-600 text-sm mb-4">{errors.results}</p>
          )}

          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className="bg-white rounded-xl p-4 border border-[var(--color-border)]"
                >
                  <div className="flex items-center gap-2">
                    {/* Position Badge */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveResult(result.id, "up")}
                        disabled={index === 0}
                        className="text-[var(--color-muted)] hover:text-[var(--foreground)] disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ChevronUp className="w-5 h-5" />
                      </button>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
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
                        aria-label={`Position ${result.position}`}
                      >
                        {result.dnf ? t("raceExtras.dnf") : result.position}
                      </div>
                      {!result.dnf && result.position <= 3 && (
                        <span className="text-xs text-[var(--color-muted)]">
                          {result.position === 1 && "1st"}
                          {result.position === 2 && "2nd"}
                          {result.position === 3 && "3rd"}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => moveResult(result.id, "down")}
                        disabled={index === results.length - 1}
                        className="text-[var(--color-muted)] hover:text-[var(--foreground)] disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Driver Select */}
                    <div className="flex-1 min-w-0">
                      <Select
                        label=""
                        value={result.driverId}
                        onChange={(e) =>
                          updateResult(result.id, "driverId", e.target.value)
                        }
                        options={[
                          {
                            value: "",
                            label: t("newRace.selectDriverPlaceholder"),
                          },
                          {
                            value: UNKNOWN_DRIVER_TOKEN,
                            label: UNKNOWN_DRIVER_NAME,
                          },
                          ...availableDrivers.map((d) => ({
                            value: d.id,
                            label: `#${d.number} ${d.name}`,
                          })),
                          // Also include currently selected driver
                          ...(result.driverId
                            ? allDrivers
                                .filter((d) => d.id === result.driverId)
                                .map((d) => ({
                                  value: d.id,
                                  label: `#${d.number} ${d.name}`,
                                }))
                            : []),
                        ]}
                      />
                    </div>

                    {/* Lap Time Input */}
                    {result.fastestLap && !result.dnf && (
                      <div className="w-28 shrink-0">
                        <Input
                          label=""
                          type="text"
                          value={result.lapTime}
                          onChange={(e) =>
                            updateResult(result.id, "lapTime", e.target.value)
                          }
                          placeholder="1:23"
                          className="text-center font-mono"
                        />
                      </div>
                    )}

                    {/* Points Preview */}
                    <div className="text-center min-w-[52px] shrink-0">
                      <div className="text-lg font-bold text-[var(--color-primary)]">
                        {getResultPointsPreview(result)}
                      </div>
                      <div className="text-xs text-[var(--color-muted)]">
                        {t("race.pts")}
                      </div>
                    </div>

                    {/* Fastest Lap */}
                    <label
                      className="flex items-center gap-1 cursor-pointer shrink-0"
                      title={t("newRace.fastestLap")}
                    >
                      <input
                        type="checkbox"
                        checked={result.fastestLap}
                        onChange={(e) =>
                          updateResult(
                            result.id,
                            "fastestLap",
                            e.target.checked,
                          )
                        }
                        className="w-4 h-4 accent-[var(--color-primary)]"
                        aria-label={t("newRace.fastestLap")}
                        disabled={result.dnf}
                      />
                      <Zap
                        className="w-4 h-4 text-purple-500"
                        aria-hidden="true"
                      />
                      <span className="sr-only">{t("newRace.fastestLap")}</span>
                    </label>

                    <Button
                      type="button"
                      variant={result.dnf ? "secondary" : "outline"}
                      size="sm"
                      className="px-2"
                      onClick={() => toggleDnf(result.id)}
                      title={t("raceExtras.dnf")}
                    >
                      <span className="hidden sm:inline">
                        {t("raceExtras.dnf")}
                      </span>
                      <span className="sm:hidden">D</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="px-2"
                      onClick={() => openPenaltyModal(result.id)}
                      title={t("penalties.button")}
                    >
                      <span className="hidden sm:inline">
                        {t("penalties.button")}
                      </span>
                      <span className="sm:hidden">P</span>
                    </Button>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeResult(result.id)}
                      className="text-[var(--color-delete)] hover:text-[var(--color-delete-hover)] p-2"
                      aria-label="Remove result"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {result.penalties.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.penalties.map((penalty) => (
                        <div
                          key={penalty.id}
                          className="text-xs bg-[var(--color-card)] border border-[var(--color-border)] rounded px-2 py-1 flex items-center gap-2"
                        >
                          <span>
                            {penalty.type === "points"
                              ? `${t("penalties.summaryPoints")} -${penalty.value}`
                              : penalty.type === "seconds"
                                ? `${penalty.value}s`
                                : `${t("penalties.summaryGrid")} +${penalty.value}`}
                            {penalty.note ? ` • ${penalty.note}` : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePenalty(result.id, penalty.id)}
                            className="text-[var(--color-delete)]"
                            aria-label={t("penalties.removeAria")}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[var(--color-muted)] mb-4">
                {t("newRace.noResultsYet")}
              </p>
              {allDrivers.length === 0 && (
                <p className="text-sm text-amber-600">
                  {t("newRace.noDriversWarning")}
                </p>
              )}
            </div>
          )}

          {availableDrivers.length === 0 && results.length > 0 && (
            <p className="text-sm text-[var(--color-muted)] mt-4 text-center">
              {t("newRace.allDriversAdded")}
            </p>
          )}
        </div>

        {/* Points System Reference */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            {t("newRace.pointsSystem")}
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(POINTS_SYSTEM).map(([pos, pts]) => (
              <div
                key={pos}
                className="bg-white rounded-lg px-3 py-2 border border-[var(--color-border)] text-center"
              >
                <div className="text-sm text-[var(--color-muted)]">P{pos}</div>
                <div className="font-bold text-[var(--color-primary)]">
                  {pts}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            href={`/liga/${leagueId}`}
            variant="secondary"
            className="flex-1"
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? t("newRace.submitting") : t("newRace.createRace")}
          </Button>
        </div>
      </form>

      <Modal
        isOpen={penaltyModalResultId !== null}
        onClose={() => setPenaltyModalResultId(null)}
        title={t("penalties.addTitle")}
        footer={
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setPenaltyModalResultId(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" className="flex-1" onClick={addPenalty}>
              {t("common.save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            label={t("penalties.typeLabel")}
            value={penaltyType}
            onChange={(e) =>
              setPenaltyType(e.target.value as "seconds" | "grid" | "points")
            }
            options={[
              { value: "seconds", label: t("penalties.optionSeconds") },
              { value: "grid", label: t("penalties.optionGrid") },
              { value: "points", label: t("penalties.optionPoints") },
            ]}
          />
          <Input
            label={t("penalties.valueLabel")}
            type="number"
            min="1"
            value={penaltyValue}
            onChange={(e) => setPenaltyValue(e.target.value)}
          />
          <Input
            label={t("penalties.noteOptional")}
            value={penaltyNote}
            onChange={(e) => setPenaltyNote(e.target.value)}
            placeholder={t("penalties.noteOptional")}
          />
        </div>
      </Modal>
    </div>
  );
}
