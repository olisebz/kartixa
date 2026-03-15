/**
 * Shared normalization utilities used by both client and server code.
 */

export function normalizeTracks(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((track) => (typeof track === "string" ? track.trim() : ""))
      .filter((track) => track.length > 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      return normalizeTracks(parsed);
    } catch {
      return trimmed
        .split(",")
        .map((track) => track.trim())
        .filter((track) => track.length > 0);
    }
  }

  if (value && typeof value === "object") {
    return normalizeTracks(Object.values(value));
  }

  return [];
}

export function normalizeTeamNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    const name = item.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }

  return result;
}
