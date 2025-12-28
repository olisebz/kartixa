"use client";

import { useState, useId } from "react";
import Button from "@/components/Button";
import Input from "@/components/forms/Input";
import Textarea from "@/components/forms/Textarea";

interface ListItem {
  id: string;
  value: string;
}

export default function CreateLigaPage() {
  const baseId = useId();
  const [nextId, setNextId] = useState(1);

  const generateId = () => {
    const id = `${baseId}-${nextId}`;
    setNextId((prev) => prev + 1);
    return id;
  };

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tracks: [{ id: `${baseId}-track-0`, value: "" }] as ListItem[],
    drivers: [{ id: `${baseId}-driver-0`, value: "" }] as ListItem[],
  });

  const handleAddDriver = () => {
    setFormData((prev) => ({
      ...prev,
      drivers: [...prev.drivers, { id: generateId(), value: "" }],
    }));
  };

  const handleRemoveDriver = (id: string) => {
    if (formData.drivers.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      drivers: prev.drivers.filter((d) => d.id !== id),
    }));
  };

  const handleDriverChange = (id: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      drivers: prev.drivers.map((d) => (d.id === id ? { ...d, value } : d)),
    }));
  };

  const handleAddTrack = () => {
    setFormData((prev) => ({
      ...prev,
      tracks: [...prev.tracks, { id: generateId(), value: "" }],
    }));
  };

  const handleRemoveTrack = (id: string) => {
    if (formData.tracks.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((t) => t.id !== id),
    }));
  };

  const handleTrackChange = (id: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === id ? { ...t, value } : t)),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate at least one driver and one track with non-empty values
    const hasValidDriver = formData.drivers.some((d) => d.value.trim() !== "");
    const hasValidTrack = formData.tracks.some((t) => t.value.trim() !== "");

    if (!hasValidDriver || !hasValidTrack) {
      alert("Please add at least one driver and one track.");
      return;
    }

    // Phase 1: UI only - no actual submission
    alert("League created! (Demo - no data saved)");
  };

  return (
    <div className="py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button href="/liga" variant="secondary" size="sm" className="mb-4">
          ← Back to Leagues
        </Button>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Create New League
        </h1>
        <p className="text-[var(--color-muted)] mt-1">
          Set up a new Go-Kart league with drivers and tracks
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* League Info */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            League Information
          </h2>
          <Input
            label="League Name"
            placeholder="e.g. Summer Championship 2025"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            required
          />
          <Textarea
            label="Description"
            placeholder="Describe your league..."
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={3}
          />
        </div>

        {/* Drivers */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Drivers
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddDriver}
            >
              + Add Driver
            </Button>
          </div>
          <div className="space-y-3">
            {formData.drivers.map((driver, index) => (
              <div key={driver.id} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label={`Driver ${index + 1}`}
                    placeholder="Driver name"
                    value={driver.value}
                    onChange={(e) =>
                      handleDriverChange(driver.id, e.target.value)
                    }
                  />
                </div>
                {formData.drivers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDriver(driver.id)}
                    className="mt-7 px-3 py-2 text-[var(--color-error,#dc2626)] hover:bg-[var(--color-card-hover)] rounded-lg transition-colors"
                    aria-label={`Remove driver ${index + 1}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tracks */}
        <div className="bg-[var(--color-card)] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Tracks
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTrack}
            >
              + Add Track
            </Button>
          </div>
          <p className="text-sm text-[var(--color-muted)]">
            Add the tracks where races will be held
          </p>
          <div className="space-y-3">
            {formData.tracks.map((track, index) => (
              <div key={track.id} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label={`Track ${index + 1}`}
                    placeholder="e.g. Speedway Arena, Berlin"
                    value={track.value}
                    onChange={(e) =>
                      handleTrackChange(track.id, e.target.value)
                    }
                  />
                </div>
                {formData.tracks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTrack(track.id)}
                    className="mt-7 px-3 py-2 text-[var(--color-error,#dc2626)] hover:bg-[var(--color-card-hover)] rounded-lg transition-colors"
                    aria-label={`Remove track ${index + 1}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button href="/liga" variant="secondary">
            Cancel
          </Button>
          <Button type="submit">Create League</Button>
        </div>
      </form>
    </div>
  );
}
