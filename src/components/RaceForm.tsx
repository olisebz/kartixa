"use client";

import { useState, useId } from "react";
import {
  Flag,
  CheckCircle,
  Plus,
  X,
  Zap,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import { api } from "@/lib/api";
import { normalizeTracks } from "@/lib/normalize";
import {
  POINTS_SYSTEM,
  UNKNOWN_DRIVER_NAME,
  UNKNOWN_DRIVER_TOKEN,
} from "@/server/domain/constants";
import { useLocale } from "@/LocaleContext";
import type { LeagueDetailDTO, DriverDTO } from "@/server/domain/dto";

export interface RaceResultEntry {
  id: string;
  driverId: string;
  position: number;
  lapTime: string;
  fastestLap: boolean;
  dnf: boolean;
  penalties: PenaltyEntry[];
}

export interface PenaltyEntry {
  id: string;
  type: "seconds" | "grid" | "points";
  value: number;
  note: string;
}

function normalizeResultsWithDnf(results: RaceResultEntry[]): RaceResultEntry[] {
  const finishers = results.filter((r) => !r.dnf);
  const dnfResults = results.filter((r) => r.dnf);
  return [...finishers, ...dnfResults].map((r, index) => ({ ...r, position: index + 1 }));
}

interface RaceFormProps {
  mode: "create" | "edit";
  leagueId: string;
  seasonId: string;
  raceId?: string;
  league: LeagueDetailDTO;
  allDrivers: DriverDTO[];
  initialRaceName?: string;
  initialTrack?: string;
  initialCustomTrack?: string;
  initialDate?: string;
  initialResults?: RaceResultEntry[];
}

export default function RaceForm({
  mode,
  leagueId,
  seasonId,
  raceId,
  league,
  allDrivers,
  initialRaceName = "",
  initialTrack = "",
  initialCustomTrack = "",
  initialDate = new Date().toISOString().split("T")[0],
  initialResults = [],
}: RaceFormProps) {
  const { t } = useLocale();
  const baseId = useId();

  const [raceName, setRaceName] = useState(initialRaceName);
  const [track, setTrack] = useState(initialTrack);
  const [customTrack, setCustomTrack] = useState(initialCustomTrack);
  const [date, setDate] = useState(initialDate);
  const [results, setResults] = useState<RaceResultEntry[]>(initialResults);
  const [resultIdCounter, setResultIdCounter] = useState(initialResults.length);

  const [penaltyModalResultId, setPenaltyModalResultId] = useState<string | null>(null);
  const [penaltyType, setPenaltyType] = useState<"seconds" | "grid" | "points">("seconds");
  const [penaltyValue, setPenaltyValue] = useState("5");
  const [penaltyNote, setPenaltyNote] = useState("");

  const [errors, setErrors] = useState<{ raceName?: string; track?: string; results?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedRaceId, setSavedRaceId] = useState<string | null>(raceId ?? null);

  const [showDeleteNotice, setShowDeleteNotice] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const leagueTracks = normalizeTracks(league.tracks);
  const trackOptions = [
    { value: "", label: t("newRace.selectTrackPlaceholder") },
    ...leagueTracks.map((tr) => ({ value: tr, label: tr })),
    { value: "__custom__", label: "+ Add new track" },
  ];

  const usedDriverIds = new Set(
    results.map((r) => r.driverId).filter((id) => id !== UNKNOWN_DRIVER_TOKEN),
  );
  const availableDrivers = allDrivers.filter((d) => !usedDriverIds.has(d.id));

  const addResult = () => {
    setResults((prev) => [
      ...prev,
      {
        id: `${baseId}-result-${resultIdCounter}`,
        driverId: "",
        position: prev.length + 1,
        lapTime: "",
        fastestLap: false,
        dnf: false,
        penalties: [],
      },
    ]);
    setResultIdCounter((c) => c + 1);
  };

  const updateResult = (id: string, field: keyof RaceResultEntry, value: string | number | boolean) => {
    if (field === "fastestLap" && value === true) {
      setResults((prev) =>
        prev.map((r) => ({
          ...r,
          fastestLap: r.id === id && !r.dnf,
          lapTime: r.id === id ? r.lapTime : "",
        })),
      );
    } else {
      setResults((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    }
  };

  const removeResult = (id: string) => {
    setResults((prev) => normalizeResultsWithDnf(prev.filter((r) => r.id !== id)));
  };

  const moveResult = (id: string, direction: "up" | "down") => {
    setResults((prev) => {
      const index = prev.findIndex((r) => r.id === id);
      if (
        (direction === "up" && index === 0) ||
        (direction === "down" && index === prev.length - 1)
      ) {
        return prev;
      }
      const next = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return normalizeResultsWithDnf(next);
    });
  };

  const toggleDnf = (id: string) => {
    setResults((prev) => {
      const updated = prev.map((r) => {
        if (r.id !== id) return r;
        const nextDnf = !r.dnf;
        return { ...r, dnf: nextDnf, fastestLap: nextDnf ? false : r.fastestLap, lapTime: nextDnf ? "" : r.lapTime };
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
    if (!penaltyModalResultId) return;
    const value = Number.parseInt(penaltyValue, 10);
    if (Number.isNaN(value) || value < 1) return;

    setResults((prev) =>
      prev.map((r) => {
        if (r.id !== penaltyModalResultId) return r;
        return {
          ...r,
          penalties: [
            ...r.penalties,
            {
              id: `${r.id}-penalty-${Date.now()}-${r.penalties.length}`,
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
    setResults((prev) =>
      prev.map((r) => {
        if (r.id !== resultId) return r;
        return { ...r, penalties: r.penalties.filter((p) => p.id !== penaltyId) };
      }),
    );
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!raceName.trim()) newErrors.raceName = t("newRace.errors.nameRequired");
    const selectedTrack = track === "__custom__" ? customTrack : track;
    if (!selectedTrack.trim()) newErrors.track = t("newRace.errors.trackRequired");
    if (results.length === 0) newErrors.results = t("newRace.errors.atLeastOne");
    else if (results.some((r) => !r.driverId)) newErrors.results = t("newRace.errors.driverRequired");
    else if (results.filter((r) => r.fastestLap).length > 1) newErrors.results = t("newRace.errors.fastestLapMultiple");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPointsWithBonus = (position: number, hasFastestLap: boolean) =>
    (POINTS_SYSTEM[position] || 0) + (hasFastestLap && position <= 10 ? 1 : 0);

  const getResultPointsPreview = (result: RaceResultEntry) => {
    if (result.driverId === UNKNOWN_DRIVER_TOKEN || result.dnf) return 0;
    const penaltyDeduction = result.penalties
      .filter((p) => p.type === "points")
      .reduce((sum, p) => sum + p.value, 0);
    return getPointsWithBonus(result.position, result.fastestLap) - penaltyDeduction;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const selectedTrack = track === "__custom__" ? customTrack : track;
    const normalizedResults = normalizeResultsWithDnf(results);
    const resultPayload = normalizedResults.map((r) => ({
      driverId: r.driverId,
      position: r.position,
      lapTime: r.lapTime || null,
      fastestLap: r.dnf ? false : r.fastestLap,
      dnf: r.dnf,
      penalties: r.penalties.map((p) => ({ type: p.type, value: p.value, note: p.note || null })),
    }));

    setSubmitting(true);
    try {
      if (mode === "create") {
        const race = await api.races.create(leagueId, seasonId, {
          name: raceName,
          track: selectedTrack,
          date,
          results: resultPayload,
        });
        setSavedRaceId(race.id);
      } else {
        await api.races.update(leagueId, raceId!, {
          name: raceName,
          track: selectedTrack,
          date,
          results: resultPayload,
        });
      }
      setShowSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("newRace.failedCreate");
      setErrors({ results: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="py-4 sm:py-8 max-w-2xl mx-auto text-center">
        <div className="bg-[var(--color-card)] rounded-2xl p-8">
          <div className="mb-4 flex justify-center">
            {mode === "create" ? (
              <Flag className="w-16 h-16 text-[var(--color-primary)]" />
            ) : (
              <CheckCircle className="w-16 h-16 text-green-500" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            {mode === "create" ? t("newRace.success") : "Race Updated!"}
          </h1>
          <p className="text-[var(--color-muted)] mb-6">
            {mode === "create" ? t("newRace.createdMessage") : "Your changes have been saved successfully."}
          </p>
          <div className="flex gap-4 justify-center">
            <Button href={savedRaceId ? `/liga/${leagueId}/race/${savedRaceId}` : `/liga/${leagueId}`} variant="secondary">
              {mode === "create" ? t("newRace.viewRace") : "View Race"}
            </Button>
            {mode === "create" ? (
              <Button
                onClick={() => {
                  setShowSuccess(false);
                  setSavedRaceId(null);
                  setRaceName("");
                  setTrack("");
                  setCustomTrack("");
                  setResults([]);
                  setPenaltyModalResultId(null);
                }}
              >
                {t("newRace.addAnother")}
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setShowSuccess(false)}>
                Continue Editing
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Race Details Card */}
      <div className="bg-[var(--color-card)] rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
          {mode === "create" ? t("newRace.raceDetails") : "Race Details"}
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
              label="New Track Name"
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
          <h2 className="text-xl font-semibold text-[var(--foreground)]">{t("race.raceResults")}</h2>
          <Button type="button" variant="outline" size="sm" onClick={addResult}>
            <Plus className="w-4 h-4 mr-2" />
            {t("newRace.addPosition")}
          </Button>
        </div>

        {errors.results && <p className="text-red-600 text-sm mb-4">{errors.results}</p>}

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
                      onChange={(e) => updateResult(result.id, "driverId", e.target.value)}
                      options={[
                        { value: "", label: t("newRace.selectDriverPlaceholder") },
                        { value: UNKNOWN_DRIVER_TOKEN, label: UNKNOWN_DRIVER_NAME },
                        ...availableDrivers.map((d) => ({ value: d.id, label: `#${d.number} ${d.name}` })),
                        ...(result.driverId
                          ? allDrivers
                              .filter((d) => d.id === result.driverId)
                              .map((d) => ({ value: d.id, label: `#${d.number} ${d.name}` }))
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
                        onChange={(e) => updateResult(result.id, "lapTime", e.target.value)}
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
                    <div className="text-xs text-[var(--color-muted)]">{t("race.pts")}</div>
                  </div>

                  {/* Fastest Lap */}
                  <label
                    className="flex items-center gap-1 cursor-pointer shrink-0"
                    title={t("newRace.fastestLap")}
                  >
                    <input
                      type="checkbox"
                      checked={result.fastestLap}
                      onChange={(e) => updateResult(result.id, "fastestLap", e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-primary)]"
                      aria-label={t("newRace.fastestLap")}
                      disabled={result.dnf}
                    />
                    <Zap className="w-4 h-4 text-purple-500" aria-hidden="true" />
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
                    <span className="hidden sm:inline">{t("raceExtras.dnf")}</span>
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
                    <span className="hidden sm:inline">{t("penalties.button")}</span>
                    <span className="sm:hidden">P</span>
                  </Button>

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
            <p className="text-[var(--color-muted)] mb-4">{t("newRace.noResultsYet")}</p>
            {allDrivers.length === 0 && (
              <p className="text-sm text-amber-600">{t("newRace.noDriversWarning")}</p>
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
              <div className="font-bold text-[var(--color-primary)]">{pts}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone (edit only) */}
      {mode === "edit" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Danger Zone</h2>
          <p className="text-sm text-red-600 mb-4">
            Deleting a race will permanently remove all results. This cannot be undone.
          </p>
          {showDeleteNotice && (
            <div className="mb-4 flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-100"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await api.races.delete(leagueId, raceId!);
                    window.location.href = `/liga/${leagueId}`;
                  } catch {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowDeleteNotice(false)}>
                Cancel
              </Button>
            </div>
          )}
          {!showDeleteNotice && (
            <Button
              type="button"
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-100"
              onClick={() => setShowDeleteNotice(true)}
            >
              Delete Race
            </Button>
          )}
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-4">
        <Button
          href={mode === "edit" && raceId ? `/liga/${leagueId}/race/${raceId}` : `/liga/${leagueId}`}
          variant="secondary"
          className="flex-1"
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" className="flex-1" disabled={submitting}>
          {submitting
            ? mode === "create"
              ? t("newRace.submitting")
              : "Saving..."
            : mode === "create"
              ? t("newRace.createRace")
              : "Save Changes"}
        </Button>
      </div>

      {/* Penalty Modal */}
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
            onChange={(e) => setPenaltyType(e.target.value as "seconds" | "grid" | "points")}
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
    </form>
  );
}
