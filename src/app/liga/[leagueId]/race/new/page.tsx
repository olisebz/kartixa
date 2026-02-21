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
import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import { api } from "@/lib/api";
import { POINTS_SYSTEM } from "@/server/domain/constants";
import type { LeagueDetailDTO, DriverDTO } from "@/server/domain/dto";

interface RaceResultEntry {
  id: string;
  driverId: string;
  position: number;
  lapTime: string;
  fastestLap: boolean;
}

export default function NewRacePage() {
  const params = useParams();
  const leagueId = params.leagueId as string;

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

  // Validation state
  const [errors, setErrors] = useState<{
    raceName?: string;
    track?: string;
    results?: string;
  }>({});

  // Get available drivers (not yet in results)
  const usedDriverIds = new Set(results.map((r) => r.driverId));
  const availableDrivers = allDrivers.filter((d) => !usedDriverIds.has(d.id));

  // Track options
  const trackOptions = [
    { value: "", label: "Select a track..." },
    ...(league?.tracks || []).map((t) => ({ value: t, label: t })),
    { value: "__custom__", label: "+ Add new track" },
  ];

  const addResult = () => {
    if (availableDrivers.length === 0) return;

    const newPosition = results.length + 1;
    setResults([
      ...results,
      {
        id: `${baseId}-result-${resultIdCounter}`,
        driverId: "",
        position: newPosition,
        lapTime: "",
        fastestLap: false,
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
          fastestLap: r.id === id,
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
    // Recalculate positions
    setResults(newResults.map((r, index) => ({ ...r, position: index + 1 })));
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

    // Recalculate positions
    setResults(newResults.map((r, i) => ({ ...r, position: i + 1 })));
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!raceName.trim()) {
      newErrors.raceName = "Race name is required";
    }

    const selectedTrack = track === "__custom__" ? customTrack : track;
    if (!selectedTrack.trim()) {
      newErrors.track = "Track is required";
    }

    if (results.length === 0) {
      newErrors.results = "At least one race result is required";
    } else if (results.some((r) => !r.driverId)) {
      newErrors.results = "All result entries must have a driver selected";
    } else if (results.filter((r) => r.fastestLap).length > 1) {
      newErrors.results = "Only one driver can have the fastest lap";
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

    setSubmitting(true);
    try {
      const race = await api.races.create(leagueId, seasonId, {
        name: raceName,
        track: selectedTrack,
        date,
        results: results.map((r) => ({
          driverId: r.driverId,
          position: r.position,
          lapTime: r.lapTime || null,
          fastestLap: r.fastestLap,
        })),
      });
      setCreatedRaceId(race.id);
      setShowSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create race";
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

  // Success state for Phase 1
  const [showSuccess, setShowSuccess] = useState(false);

  // Success message UI
  if (showSuccess) {
    return (
      <div className="py-8 max-w-2xl mx-auto text-center">
        <div className="bg-[var(--color-card)] rounded-2xl p-8">
          <div className="mb-4 flex justify-center">
            <Flag className="w-16 h-16 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Race Created!
          </h1>
          <p className="text-[var(--color-muted)] mb-6">
            The race has been successfully recorded.
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
              View Race
            </Button>
            <Button
              onClick={() => {
                setShowSuccess(false);
                setCreatedRaceId(null);
                setRaceName("");
                setTrack("");
                setCustomTrack("");
                setResults([]);
              }}
            >
              Add Another Race
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
        <p className="text-red-600 mb-4">Failed to load: {pageError}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          href={`/liga/${leagueId}`}
          variant="secondary"
          size="sm"
          className="mb-4"
        >
          ← Back to League
        </Button>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          New Race
        </h1>
        <p className="text-[var(--color-muted)] mt-1">
          Add a new race to {league?.name || "the league"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Race Details Card */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            Race Details
          </h2>

          <div className="space-y-4">
            <Input
              label="Race Name"
              value={raceName}
              onChange={(e) => setRaceName(e.target.value)}
              placeholder="e.g., Summer Grand Prix"
              error={errors.raceName}
              required
            />

            <Select
              label="Track"
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              options={trackOptions}
              error={track !== "__custom__" ? errors.track : undefined}
              required
            />

            {track === "__custom__" && (
              <Input
                label="New Track Name"
                value={customTrack}
                onChange={(e) => setCustomTrack(e.target.value)}
                placeholder="Enter track name"
                error={errors.track}
                required
              />
            )}

            <Input
              label="Date"
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
              Race Results
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addResult}
              disabled={availableDrivers.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Position
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
                  <div className="flex items-center gap-4">
                    {/* Position Badge */}
                    <div className="flex flex-col items-center gap-1">
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
                          result.position === 1
                            ? "bg-yellow-500"
                            : result.position === 2
                              ? "bg-gray-400"
                              : result.position === 3
                                ? "bg-amber-700"
                                : "bg-[var(--color-primary)]"
                        }`}
                        aria-label={`Position ${result.position}`}
                      >
                        {result.position}
                      </div>
                      {result.position <= 3 && (
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
                        className="text-[var(--color-muted)} hover:text-[var(--foreground)] disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Driver Select */}
                    <div className="flex-1">
                      <Select
                        label=""
                        value={result.driverId}
                        onChange={(e) =>
                          updateResult(result.id, "driverId", e.target.value)
                        }
                        options={[
                          { value: "", label: "Select driver..." },
                          ...availableDrivers.map((d) => ({
                            value: d.id,
                            label: d.name,
                          })),
                          // Also include currently selected driver
                          ...(result.driverId
                            ? allDrivers
                                .filter((d) => d.id === result.driverId)
                                .map((d) => ({ value: d.id, label: d.name }))
                            : []),
                        ]}
                      />
                    </div>

                    {/* Lap Time Input */}
                    <div className="min-w-[120px]">
                      <Input
                        label=""
                        type="text"
                        value={result.lapTime}
                        onChange={(e) =>
                          updateResult(result.id, "lapTime", e.target.value)
                        }
                        placeholder="01:23.456"
                        className="text-center font-mono"
                        disabled={!result.fastestLap}
                      />
                    </div>

                    {/* Points Preview */}
                    <div className="text-center min-w-[60px]">
                      <div className="text-lg font-bold text-[var(--color-primary)]">
                        {getPointsWithBonus(result.position, result.fastestLap)}
                      </div>
                      <div className="text-xs text-[var(--color-muted)]">
                        points
                      </div>
                    </div>

                    {/* Fastest Lap */}
                    <label
                      className="flex items-center gap-2 cursor-pointer"
                      title="Fastest Lap"
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
                        aria-label="Fastest lap"
                      />
                      <Zap
                        className="w-4 h-4 text-purple-500"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Fastest lap</span>
                    </label>

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
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[var(--color-muted)] mb-4">
                No results added yet. Add positions to record the race outcome.
              </p>
              {allDrivers.length === 0 && (
                <p className="text-sm text-amber-600">
                  ⚠️ This league has no drivers. Add drivers first before
                  recording a race.
                </p>
              )}
            </div>
          )}

          {availableDrivers.length === 0 && results.length > 0 && (
            <p className="text-sm text-[var(--color-muted)] mt-4 text-center">
              All drivers have been added to results.
            </p>
          )}
        </div>

        {/* Points System Reference */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            Points System
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
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? "Creating..." : "Create Race"}
          </Button>
        </div>
      </form>
    </div>
  );
}
