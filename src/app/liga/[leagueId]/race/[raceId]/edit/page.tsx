"use client";

import { useState, useId, useMemo } from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import { getLeagueById, getRaceById, POINTS_SYSTEM } from "@/lib/mockData";

interface RaceResultEntry {
  id: string;
  driverId: string;
  position: number;
  lapTime: string;
  fastestLap: boolean;
}

export default function EditRacePage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const raceId = params.raceId as string;

  const league = getLeagueById(leagueId);
  const race = getRaceById(leagueId, raceId);

  if (!league || !race) {
    notFound();
  }

  const baseId = useId();
  const [resultIdCounter, setResultIdCounter] = useState(race.results.length);

  // Initialize form state from existing race data
  const [raceName, setRaceName] = useState(race.name);
  const [track, setTrack] = useState(
    league.tracks.includes(race.track) ? race.track : "__custom__",
  );
  const [customTrack, setCustomTrack] = useState(
    league.tracks.includes(race.track) ? "" : race.track,
  );
  const [date, setDate] = useState(race.date);
  const [results, setResults] = useState<RaceResultEntry[]>(
    race.results.map((r, index) => ({
      id: `${baseId}-result-${index}`,
      driverId: r.driverId,
      position: r.position,
      lapTime: r.lapTime || "",
      fastestLap: r.fastestLap || false,
    })),
  );

  // Validation state
  const [errors, setErrors] = useState<{
    raceName?: string;
    track?: string;
    results?: string;
  }>({});

  const [showSuccess, setShowSuccess] = useState(false);

  // Delete notification state
  const [showDeleteNotice, setShowDeleteNotice] = useState(false);

  // Get available drivers (not yet in results)
  const availableDrivers = useMemo(() => {
    const usedDriverIds = new Set(results.map((r) => r.driverId));
    return league.drivers.filter((d) => !usedDriverIds.has(d.id));
  }, [results, league.drivers]);

  // Track options
  const trackOptions = [
    { value: "", label: "Select a track..." },
    ...league.tracks.map((t) => ({ value: t, label: t })),
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
        lapTime: "",
        position: newPosition,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const selectedTrack = track === "__custom__" ? customTrack : track;

    const updatedRace = {
      ...race,
      name: raceName,
      track: selectedTrack,
      date,
      results: results.map((r) => {
        const driver = league.drivers.find((d) => d.id === r.driverId);
        const basePoints =
          POINTS_SYSTEM[r.position as keyof typeof POINTS_SYSTEM] || 0;
        const fastestLapBonus = r.fastestLap && r.position <= 10 ? 1 : 0;
        return {
          driverId: r.driverId,
          driverName: driver?.name || "",
          position: r.position,
          lapTime: r.lapTime || undefined,
          points: basePoints + fastestLapBonus,
          fastestLap: r.fastestLap,
        };
      }),
    };

    void updatedRace;
    setShowSuccess(true);
  };

  // Calculate points including fastest lap bonus
  const getPointsWithBonus = (position: number, hasFastestLap: boolean) => {
    const basePoints =
      POINTS_SYSTEM[position as keyof typeof POINTS_SYSTEM] || 0;
    const bonus = hasFastestLap && position <= 10 ? 1 : 0;
    return basePoints + bonus;
  };

  if (showSuccess) {
    return (
      <div className="py-8 max-w-2xl mx-auto text-center">
        <div className="bg-[var(--color-card)] rounded-2xl p-8">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Race Updated!
          </h1>
          <p className="text-[var(--color-muted)] mb-6">
            Your changes have been saved successfully.
          </p>
          <div className="flex gap-4 justify-center">
            <Button href={`/liga/${leagueId}/race/${raceId}`}>View Race</Button>
            <Button variant="secondary" onClick={() => setShowSuccess(false)}>
              Continue Editing
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          href={`/liga/${leagueId}/race/${raceId}`}
          variant="secondary"
          size="sm"
          className="mb-4"
        >
          ← Back to Race
        </Button>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Edit Race
        </h1>
        <p className="text-[var(--color-muted)] mt-1">
          Update race details and results
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
                        ▲
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
                        className="text-[var(--color-muted)] hover:text-[var(--foreground)] disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ▼
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
                          ...(result.driverId
                            ? league.drivers
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
                      <span className="text-sm" aria-hidden="true">
                        🏎️
                      </span>
                      <span className="sr-only">Fastest lap</span>
                    </label>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeResult(result.id)}
                      className="text-[var(--color-delete)] hover:text-[var(--color-delete-hover)] p-2"
                      aria-label="Remove result"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--color-muted)] text-center py-8">
              No results. Add positions to record the race outcome.
            </p>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Danger Zone
          </h2>
          <p className="text-sm text-red-600 mb-4">
            Deleting a race will permanently remove all results. This cannot be
            undone.
          </p>
          {showDeleteNotice && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
              ℹ️ Delete functionality will be available in Phase 2 when data
              persistence is implemented.
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-100"
            onClick={() => setShowDeleteNotice(true)}
          >
            Delete Race
          </Button>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            href={`/liga/${leagueId}/race/${raceId}`}
            variant="secondary"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
