"use client";

import { useState, useEffect } from "react";
import Card, { CardTitle, CardDescription } from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/forms/Input";
import { OnboardingButton } from "@/components/Onboarding";
import { api } from "@/lib/api";
import type { LeagueListDTO } from "@/server/domain/dto";
import { Plus, Users, Flag, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/LocaleContext";

export default function LigaPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [leagues, setLeagues] = useState<LeagueListDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    api.leagues
      .list()
      .then(setLeagues)
      .catch((err) => {
        if (err?.status === 401) {
          router.push("/login?callbackUrl=/liga");
          return;
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleJoinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    setJoinLoading(true);
    setJoinError(null);

    try {
      const result = await api.leagues.joinByCode({ code });
      router.push(`/liga/${result.leagueId}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("leagues.joinCode.join");
      setJoinError(message);
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-600 mb-4">{t("leagues.failedLoad")}: {error}</p>
        <Button onClick={() => window.location.reload()}>{t("common.retry")}</Button>
      </div>
    );
  }

  return (
    <div className="py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
            {t("leagues.title")}
          </h1>
          <p className="text-[var(--color-muted)] mt-1 text-sm sm:text-base">
            {t("leagues.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <OnboardingButton />
          <Button href="/liga/new" size="sm">
            <Plus className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{t("leagues.createNew")}</span>
            <span className="sm:hidden">{t("leagues.createNewShort")}</span>
          </Button>
        </div>
      </div>

      <div className="bg-[var(--color-card)] rounded-2xl p-4 sm:p-5 mb-6">
        <h2 className="text-base font-semibold text-[var(--foreground)] mb-1">
          {t("leagues.joinCode.title")}
        </h2>
        <p className="text-sm text-[var(--color-muted)] mb-3">
          {t("leagues.joinCode.description")}
        </p>
        <div className="flex items-end gap-2">
          <Input
            id="join-code"
            label={t("leagues.joinCode.label")}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder={t("leagues.joinCode.placeholder")}
            className="flex-1"
          />
          <Button
            onClick={handleJoinByCode}
            disabled={joinLoading || !joinCode.trim()}
            size="sm"
            className="shrink-0 mb-px"
          >
            {joinLoading ? t("leagues.joinCode.joining") : t("leagues.joinCode.join")}
          </Button>
        </div>
        {joinError && <p className="text-sm text-red-600 mt-2">{joinError}</p>}
      </div>

      {leagues.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {leagues.map((league) => (
            <Card key={league.id} href={`/liga/${league.id}`}>
              <CardTitle>{league.name}</CardTitle>
              <CardDescription>{league.description}</CardDescription>
              <div className="mt-4 flex items-center gap-4 text-sm text-[var(--color-muted)]">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{league.driverCount} {t("leagues.drivers")}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Flag className="w-4 h-4" />
                  <span>{league.raceCount} {t("leagues.races")}</span>
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-[var(--color-muted)] text-lg mb-4">
            {t("leagues.empty")}
          </p>
          <Button href="/liga/new">
            <Plus className="w-5 h-5 mr-2" />
            {t("leagues.createNew")}
          </Button>
        </div>
      )}
    </div>
  );
}
