"use client";

import { useEffect, useState } from "react";
import { Loader2, LogOut, User, Trash2, DoorOpen, Shield } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/forms/Input";
import { ApiClientError, api } from "@/lib/api";
import type { LeagueListDTO } from "@/server/domain/dto";

function getSessionPlatform(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";

  const ua = userAgent.toLowerCase();

  if (ua.includes("macintosh") || ua.includes("mac os x")) return "Mac";
  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("android")) return "Android";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("linux")) return "Linux";

  return "Unknown device";
}

function getSessionBrowser(userAgent: string | null): string {
  if (!userAgent) return "Unknown browser";

  const ua = userAgent.toLowerCase();

  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("chrome/")) return "Chrome";
  if (ua.includes("firefox/")) return "Firefox";
  if (ua.includes("safari/")) return "Safari";

  return "Unknown browser";
}

function getSessionDisplay(userAgent: string | null): string {
  return `${getSessionPlatform(userAgent)} · ${getSessionBrowser(userAgent)}`;
}

export default function SettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [leagues, setLeagues] = useState<LeagueListDTO[]>([]);
  const [sessions, setSessions] = useState<
    {
      id: string;
      deviceId: string;
      userAgent: string | null;
      ipAddress: string | null;
      createdAt: string;
      lastSeenAt: string;
      expiresAt: string;
      isCurrent: boolean;
    }[]
  >([]);
  const [passwordChangeChallengeId, setPasswordChangeChallengeId] = useState<
    string | null
  >(null);
  const [passwordChangeCode, setPasswordChangeCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEditProfileName =
    leagues.length === 0 ||
    leagues.some(
      (league) => league.role === "admin" || league.role === "owner",
    );

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profile, leagueList, sessionList] = await Promise.all([
        api.auth.profile.get(),
        api.leagues.list(),
        api.auth.sessions.list(),
      ]);
      setName(profile.name);
      setEmail(profile.email);
      setLeagues(leagueList);
      setSessions(sessionList);
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 401) {
        router.push("/login?callbackUrl=/settings");
        return;
      }

      const message =
        err instanceof Error ? err.message : "Failed to load profile";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveName = async () => {
    if (!canEditProfileName) {
      setError("Watcher members cannot edit profile name");
      return;
    }

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setSavingName(true);
    setError(null);
    try {
      await api.auth.profile.update({ name: name.trim() });
      setNotice("Profile updated");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update name";
      setError(message);
    } finally {
      setSavingName(false);
    }
  };

  const handleLeaveLeague = async (leagueId: string) => {
    setError(null);
    try {
      await api.leagues.members.leave(leagueId);
      setNotice("You left the league");
      await loadData();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to leave league";
      setError(message);
    }
  };

  const handleDeleteLeague = async (leagueId: string) => {
    setError(null);
    try {
      await api.leagues.delete(leagueId);
      setNotice("League deleted");
      await loadData();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete league";
      setError(message);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const handleStartPasswordChange = async () => {
    setError(null);
    setNotice(null);
    try {
      const challenge = await api.auth.password.change.request();
      setPasswordChangeChallengeId(challenge.challengeId);
      setNotice(
        "Wir haben dir einen Verifizierungscode für die Passwortänderung gesendet.",
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to start password change";
      setError(message);
    }
  };

  const handleConfirmPasswordChange = async () => {
    setError(null);
    setNotice(null);

    if (!passwordChangeChallengeId) {
      setError("Bitte zuerst einen Verifizierungscode anfordern");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("Neues Passwort muss mindestens 8 Zeichen lang sein");
      return;
    }

    setChangingPassword(true);
    try {
      await api.auth.password.change.confirm({
        challengeId: passwordChangeChallengeId,
        code: passwordChangeCode,
        newPassword,
      });
      setPasswordChangeChallengeId(null);
      setPasswordChangeCode("");
      setNewPassword("");
      setNotice("Passwort aktualisiert. Andere Sessions wurden abgemeldet.");
      await loadData();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to change password";
      setError(message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setError(null);
    setNotice(null);
    setRevokingSessionId(sessionId);
    try {
      await api.auth.sessions.revoke({ sessionId });
      setNotice("Session wurde entfernt");
      await loadData();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to revoke session";
      setError(message);
    } finally {
      setRevokingSessionId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (error && !name) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-600 mb-4">Failed to load profile: {error}</p>
        <Button onClick={loadData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Button href="/liga" variant="secondary" size="sm" className="mb-4">
          ← Back to Leagues
        </Button>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Profile</h1>
        <p className="text-[var(--color-muted)] mt-1">
          Manage your account and league memberships.
        </p>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 text-green-700 p-3 text-sm">
          {notice}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-[var(--color-card)] rounded-2xl p-6 mb-6">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Account
        </h2>

        <div className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            disabled={!canEditProfileName}
          />

          <Input label="Email" value={email} disabled onChange={() => {}} />

          <div className="flex gap-3">
            <Button
              onClick={handleSaveName}
              disabled={savingName || !canEditProfileName}
            >
              {savingName ? "Saving..." : "Save Name"}
            </Button>

            <Button variant="secondary" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-card)] rounded-2xl p-6 mb-6">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
          Your Leagues
        </h2>
        <p className="text-[var(--color-muted)] mb-4 text-sm">
          Leave leagues or delete leagues where you are admin.
        </p>

        <div className="space-y-3">
          {!canEditProfileName && (
            <p className="text-sm text-[var(--color-muted)]">
              Your account is watcher-only in joined leagues. Name editing is
              disabled.
            </p>
          )}
          {leagues.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              You are not in any league.
            </p>
          ) : (
            leagues.map((league) => (
              <div
                key={league.id}
                className="rounded-xl border border-[var(--color-border)] p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-[var(--foreground)]">
                    {league.name}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    Role: {league.role}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleLeaveLeague(league.id)}
                    disabled={league.role === "owner"}
                  >
                    <DoorOpen className="w-4 h-4 mr-2" />
                    Leave
                  </Button>
                  {(league.role === "admin" || league.role === "owner") && (
                    <Button
                      size="sm"
                      onClick={() => handleDeleteLeague(league.id)}
                      className="bg-[var(--color-delete)] hover:bg-[var(--color-delete-hover)]"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-[var(--color-card)] rounded-2xl p-6 mb-6">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security
        </h2>
        <p className="text-[var(--color-muted)] mb-4 text-sm">
          Manage active sessions and change your password via email
          verification.
        </p>

        <div className="space-y-3 mb-5">
          {sessions.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              No active sessions found.
            </p>
          ) : (
            sessions.map((sessionItem) => (
              <div
                key={sessionItem.id}
                className="rounded-xl border border-[var(--color-border)] p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-[var(--foreground)]">
                    {getSessionDisplay(sessionItem.userAgent)}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {sessionItem.isCurrent
                      ? "Current session"
                      : "Active session"}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    Last active:{" "}
                    {new Date(sessionItem.lastSeenAt).toLocaleString()}
                  </p>
                </div>

                {!sessionItem.isCurrent && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={revokingSessionId === sessionItem.id}
                    onClick={() => handleRevokeSession(sessionItem.id)}
                  >
                    {revokingSessionId === sessionItem.id
                      ? "Removing..."
                      : "Remove"}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-3">
          <p className="font-semibold text-[var(--foreground)]">
            Change password (email verification)
          </p>

          {passwordChangeChallengeId && (
            <Input
              label="E-Mail Code"
              value={passwordChangeCode}
              onChange={(event) => setPasswordChangeCode(event.target.value)}
              placeholder="6-stelliger Code"
            />
          )}

          <Input
            label="Neues Passwort"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
          />

          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleStartPasswordChange}>
              Code senden
            </Button>
            <Button
              onClick={handleConfirmPasswordChange}
              disabled={changingPassword}
            >
              {changingPassword ? "Aktualisieren..." : "Passwort ändern"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
