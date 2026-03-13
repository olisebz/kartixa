import { createHash, randomInt } from "crypto";

const DEVICE_ID_MAX = 128;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeDeviceId(raw: string | null | undefined): string {
  const value = String(raw ?? "").trim();
  if (!value) return "unknown-device";
  return value.slice(0, DEVICE_ID_MAX);
}

export function generateOtpCode(length = 6): string {
  let code = "";
  for (let index = 0; index < length; index++) {
    code += String(randomInt(0, 10));
  }
  return code;
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function hashOtpCode(code: string, challengeId: string, appSecret: string): string {
  return hashSecret(`${code}:${challengeId}:${appSecret}`);
}

export function hashSessionToken(token: string, appSecret: string): string {
  return hashSecret(`${token}:${appSecret}`);
}
