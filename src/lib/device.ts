const DEVICE_STORAGE_KEY = "kartixa-device-id";

function generateDeviceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") {
    return "unknown-device";
  }

  const existing = window.localStorage.getItem(DEVICE_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const created = generateDeviceId();
  window.localStorage.setItem(DEVICE_STORAGE_KEY, created);
  return created;
}
