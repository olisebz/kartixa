import { Flag } from "lucide-react";
import Button from "@/components/Button";

export default function LeagueNotFound() {
  return (
    <div className="py-16 text-center">
      <div className="mb-4 flex justify-center">
        <Flag className="w-16 h-16 text-[var(--color-muted)]" />
      </div>
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
