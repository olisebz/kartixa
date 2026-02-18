import type { Metadata } from "next";
import { Flag, Trophy, BarChart3, Smartphone } from "lucide-react";

export const metadata: Metadata = {
  title: "About - Kartixa",
  description: "Learn more about Kartixa, your Go-Kart league tracker.",
};

export default function AboutPage() {
  return (
    <div className="py-8 max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-[var(--foreground)] mb-4">
          Kartixa
        </h1>
        <p className="text-xl text-[var(--color-muted)]">
          Your Go-Kart League & Race Tracker
        </p>
      </div>

      <div className="space-y-8">
        <section className="bg-[var(--color-card)] rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
            What is Kartixa?
          </h2>
          <p className="text-[var(--color-muted)] leading-relaxed">
            Kartixa is a web application designed for Go-Kart enthusiasts who
            want to organize and track their racing leagues. Whether you&apos;re
            running a casual league with friends or a more competitive series,
            Kartixa helps you keep everything organized in one place.
          </p>
        </section>

        <section className="bg-[var(--color-card)] rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
            Features
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Flag className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0 mt-1" />
              <div>
                <strong className="text-[var(--foreground)]">
                  League Management
                </strong>
                <p className="text-[var(--color-muted)] text-sm">
                  Create and manage multiple leagues with custom tracks and
                  drivers.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Trophy className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
              <div>
                <strong className="text-[var(--foreground)]">
                  Driver Rankings
                </strong>
                <p className="text-[var(--color-muted)] text-sm">
                  Automatic standings calculation with a Formula 1-style points
                  system.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <BarChart3 className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0 mt-1" />
              <div>
                <strong className="text-[var(--foreground)]">
                  Race Results
                </strong>
                <p className="text-[var(--color-muted)] text-sm">
                  Record race results, fastest laps, and track performance over
                  time.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Smartphone className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0 mt-1" />
              <div>
                <strong className="text-[var(--foreground)]">
                  Modern Interface
                </strong>
                <p className="text-[var(--color-muted)] text-sm">
                  Clean, responsive design that works on desktop and mobile
                  devices.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section className="bg-[var(--color-card)] rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
            Points System
          </h2>
          <p className="text-[var(--color-muted)] mb-4">
            Kartixa uses a points system inspired by Formula 1:
          </p>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {[25, 18, 15, 12, 10, 8, 6, 4, 2, 1].map((points, index) => (
              <div
                key={index}
                className="bg-[var(--background)] rounded-lg p-2 text-center border border-[var(--color-border)]"
              >
                <div className="text-xs text-[var(--color-muted)]">
                  P{index + 1}
                </div>
                <div className="font-bold text-[var(--color-primary)]">
                  {points}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-[var(--color-muted)] mt-3">
            +1 bonus point for fastest lap (if finishing in top 10)
          </p>
        </section>

        <section className="bg-[var(--color-card)] rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
            Built With
          </h2>
          <div className="flex flex-wrap gap-2">
            {["Next.js", "TypeScript", "Tailwind CSS", "React"].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 bg-[var(--background)] rounded-full text-sm text-[var(--foreground)] border border-[var(--color-border)]"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        <section className="text-center py-8">
          <p className="text-sm text-[var(--color-muted)] mt-2">
            Version 0.1.0 • Phase 1 (UI Preview)
          </p>
        </section>
      </div>
    </div>
  );
}
