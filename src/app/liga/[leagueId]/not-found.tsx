import Button from "@/components/Button";

export default function LeagueNotFound() {
  return (
    <div className="py-16 text-center">
      <div className="text-6xl mb-4">🏁</div>
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
        League Not Found
      </h1>
      <p className="text-[var(--color-muted)] mb-8 max-w-md mx-auto">
        The league you&apos;re looking for doesn&apos;t exist or has been
        removed.
      </p>
      <Button href="/liga">Back to Leagues</Button>
    </div>
  );
}
