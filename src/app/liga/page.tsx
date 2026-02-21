"use client";

import { useState, useEffect } from "react";
import Card, { CardTitle, CardDescription } from "@/components/Card";
import Button from "@/components/Button";
import { OnboardingButton } from "@/components/Onboarding";
import { api } from "@/lib/api";
import type { LeagueListDTO } from "@/server/domain/dto";
import { Plus, Users, Flag, Loader2 } from "lucide-react";

export default function LigaPage() {
  const [leagues, setLeagues] = useState<LeagueListDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.leagues
      .list()
      .then(setLeagues)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
        <p className="text-red-600 mb-4">Failed to load leagues: {error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Leagues
          </h1>
          <p className="text-[var(--color-muted)] mt-1">
            Manage your Go-Kart leagues and track standings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <OnboardingButton />
          <Button href="/liga/new" size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Create New League
          </Button>
        </div>
      </div>

      {leagues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leagues.map((league) => (
            <Card key={league.id} href={`/liga/${league.id}`}>
              <CardTitle>{league.name}</CardTitle>
              <CardDescription>{league.description}</CardDescription>
              <div className="mt-4 flex items-center gap-4 text-sm text-[var(--color-muted)]">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {league.driverCount}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Flag className="w-4 h-4" />
                  {league.raceCount}
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-[var(--color-muted)] text-lg mb-4">
            No leagues yet. Create your first league to get started!
          </p>
          <Button href="/liga/new">
            <Plus className="w-5 h-5 mr-2" />
            Create New League
          </Button>
        </div>
      )}
    </div>
  );
}
