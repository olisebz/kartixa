import Link from "next/link";
import Card, { CardTitle, CardDescription } from "@/components/Card";
import Button from "@/components/Button";
import { leagues } from "@/lib/mockData";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leagues - Kartixa",
  description: "Browse and manage your Go-Kart leagues.",
};

export default function LigaPage() {
  return (
    <div className="py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Leagues
          </h1>
          <p className="text-[var(--color-muted)] mt-1">
            Manage your Go-Kart leagues and track standings
          </p>
        </div>
        <Link href="/liga/new">
          <Button size="lg">Create New League</Button>
        </Link>
      </div>

      {/* League Cards Grid */}
      {leagues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leagues.map((league) => (
            <Card key={league.id} href={`/liga/${league.id}`}>
              <CardTitle>{league.name}</CardTitle>
              <CardDescription>{league.description}</CardDescription>
              <div className="mt-4 flex items-center gap-4 text-sm text-[var(--color-muted)]">
                <span>{league.drivers.length} Drivers</span>
                <span>•</span>
                <span>{league.races.length} Races</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-[var(--color-muted)] text-lg mb-4">
            No leagues yet. Create your first league to get started!
          </p>
          <Link href="/liga/new">
            <Button>Create New League</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
