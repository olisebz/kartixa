"use client";

import { useState } from "react";
import Button from "@/components/Button";
import Input from "@/components/forms/Input";
import Textarea from "@/components/forms/Textarea";

export default function CreateLigaPage() {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tracks: [""],
    drivers: [""],
  });

  const handleAddDriver = () => {
    setFormData((prev) => ({
      ...prev,
      drivers: [...prev.drivers, ""],
    }));
  };

  const handleRemoveDriver = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      drivers: prev.drivers.filter((_, i) => i !== index),
    }));
  };

  const handleDriverChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      drivers: prev.drivers.map((d, i) => (i === index ? value : d)),
    }));
  };

  const handleAddTrack = () => {
    setFormData((prev) => ({
      ...prev,
      tracks: [...prev.tracks, ""],
    }));
  };

  const handleRemoveTrack = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((_, i) => i !== index),
    }));
  };

  const handleTrackChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t, i) => (i === index ? value : t)),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label={`Driver ${index + 1}`}
                    placeholder="Driver name"
                    value={driver}
                    onChange={(e) => handleDriverChange(index, e.target.value)}
                  />
                </div>
                {formData.drivers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDriver(index)}
                    className="mt-7 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label={`Track ${index + 1}`}
                    placeholder="e.g. Speedway Arena, Berlin"
                    value={track}
                    onChange={(e) => handleTrackChange(index, e.target.value)}
                  />
                </div>
                {formData.tracks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTrack(index)}
                    className="mt-7 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
