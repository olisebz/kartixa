"use client";

import { useState, useEffect, useId } from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { CheckCircle, Plus, X, Loader2 } from "lucide-react";
import Button from "@/components/Button";
import Input from "@/components/forms/Input";
import Textarea from "@/components/forms/Textarea";
import { api } from "@/lib/api";
import type { LeagueDetailDTO } from "@/server/domain/dto";

interface ListItem {
  id: string;
  value: string;
}

export default function EditLeaguePage() {
  const params = useParams();
  const leagueId = params.leagueId as string;

  const baseId = useId();

  const [league, setLeague] = useState<LeagueDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [trackIdCounter, setTrackIdCounter] = useState(0);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tracks, setTracks] = useState<ListItem[]>([]);

  // Validation state
  const [errors, setErrors] = useState<{
    name?: string;
    tracks?: string;
  }>({});

  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load league data
  useEffect(() => {
    api.leagues
      .get(leagueId)
      .then((data) => {
        setLeague(data);
        setName(data.name);
        setDescription(data.description);
        setTracks(
          data.tracks.map((track, index) => ({
            id: `${baseId}-track-${index}`,
            value: track,
          })),
        );
        setTrackIdCounter(data.tracks.length);
      })
      .catch((err) => {
        if (err.status === 404) {
          notFound();
        }
        setPageError(err.message);
      })
      .finally(() => setLoading(false));
  }, [leagueId, baseId]);

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
        <p className="text-red-600 mb-4">Failed to load league: {pageError}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // Compute stats from season DTOs
  const totalDrivers = league.seasons.reduce(
    (acc, s) => acc + s.driverCount,
    0,
  );
  const totalRaces = league.seasons.reduce((acc, s) => acc + s.raceCount, 0);

  const addTrack = () => {
    setTracks([
      ...tracks,
      { id: `${baseId}-track-${trackIdCounter}`, value: "" },
    ]);
    setTrackIdCounter((c) => c + 1);
  };

  const updateTrack = (id: string, value: string) => {
    setTracks(tracks.map((t) => (t.id === id ? { ...t, value } : t)));
  };

  const removeTrack = (id: string) => {
    if (tracks.length > 0) {
      setTracks(tracks.filter((t) => t.id !== id));
    }
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = "League name is required";
    }

    const validTracks = tracks.filter((t) => t.value.trim());
    if (validTracks.length === 0) {
      newErrors.tracks = "At least one track is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);
    try {
      const updated = await api.leagues.update(leagueId, {
        name: name.trim(),
        description: description.trim(),
        tracks: tracks.filter((t) => t.value.trim()).map((t) => t.value.trim()),
      });
      setLeague(updated);
      setShowSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update league";
      setErrors({ name: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="py-8 max-w-2xl mx-auto text-center">
        <div className="bg-[var(--color-card)] rounded-2xl p-8">
          <div className="mb-4 flex justify-center">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            League Updated!
          </h1>
          <p className="text-[var(--color-muted)] mb-6">
            Your changes have been saved successfully.
          </p>
          <div className="flex gap-4 justify-center">
            <Button href={`/liga/${leagueId}`}>Back to League</Button>
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
          href={`/liga/${leagueId}`}
          variant="secondary"
          size="sm"
          className="mb-4"
        >
          ← Back to League
        </Button>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Edit League
        </h1>
        <p className="text-[var(--color-muted)] mt-1">
          Update league details and settings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* League Details */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            League Details
          </h2>

          <div className="space-y-4">
            <Input
              label="League Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Championship 2025"
              error={errors.name}
              required
            />

            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your league..."
              rows={3}
            />
          </div>
        </div>

        {/* Tracks */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              Tracks
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTrack}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Track
            </Button>
          </div>

          {errors.tracks && (
            <p className="text-red-600 text-sm mb-4">{errors.tracks}</p>
          )}

          {tracks.length > 0 ? (
            <div className="space-y-3">
              {tracks.map((track) => (
                <div key={track.id} className="flex items-center gap-3">
                  <Input
                    label=""
                    value={track.value}
                    onChange={(e) => updateTrack(track.id, e.target.value)}
                    placeholder="Track name"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeTrack(track.id)}
                    className="text-[var(--color-delete)] hover:text-[var(--color-delete-hover)] p-2"
                    aria-label="Remove track"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--color-muted)] text-center py-4">
              No tracks added. Click &quot;Add Track&quot; to add one.
            </p>
          )}
        </div>

        {/* League Info */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            League Info
          </h2>
          <div className="space-y-2 text-[var(--color-muted)]">
            <div className="flex justify-between">
              <span>Created</span>
              <span className="font-medium text-[var(--foreground)]">
                {new Date(league.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Drivers</span>
              <span className="font-medium text-[var(--foreground)]">
                {totalDrivers}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Races</span>
              <span className="font-medium text-[var(--foreground)]">
                {totalRaces}
              </span>
            </div>
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
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
