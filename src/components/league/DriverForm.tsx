"use client";

import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import type { DriverDTO, LeagueDetailDTO } from "@/server/domain/dto";

interface DriverFormProps {
  name: string;
  number: string;
  teamId: string;
  error: string;
  league: LeagueDetailDTO;
  onNameChange: (val: string) => void;
  onNumberChange: (val: string) => void;
  onTeamIdChange: (val: string) => void;
  t: (key: string) => string;
  driver?: DriverDTO; // when editing, shows current stats
  locale?: "de" | "en";
}

export default function DriverForm({
  name,
  number,
  teamId,
  error,
  league,
  onNameChange,
  onNumberChange,
  onTeamIdChange,
  t,
  driver,
  locale = "en",
}: DriverFormProps) {
  const teamOptions = [
    { value: "", label: t("teams.none") },
    ...(league.teams ?? [])
      .filter((team) => team.isActive)
      .map((team) => ({ value: team.id, label: team.name })),
  ];

  return (
    <div>
      <Input
        label={t("drivers.driverName")}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={t("drivers.driverName")}
        error={error}
      />

      <div className="mt-4">
        <Input
          label={t("drivers.number")}
          type="number"
          min="1"
          max="999"
          value={number}
          onChange={(e) => onNumberChange(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <Select
          label={t("teams.label")}
          options={teamOptions}
          value={teamId}
          onChange={(e) => onTeamIdChange(e.target.value)}
        />
      </div>

      {driver && (
        <div className="mt-4 p-4 bg-[var(--color-card)] rounded-xl">
          <div className="text-sm text-[var(--color-muted)] space-y-1">
            <div className="flex justify-between">
              <span>{t("drivers.totalPoints")}:</span>
              <span className="font-medium">{driver.totalPoints}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("drivers.races")}:</span>
              <span className="font-medium">{driver.races}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("drivers.number")}:</span>
              <span className="font-medium">{driver.number}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("drivers.wins")}:</span>
              <span className="font-medium">{driver.wins}</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center mb-2 text-sm text-[var(--color-muted)]">
              <span>{t("penalties.history")}</span>
              <span className="font-medium">{driver.penaltiesHistory.length}</span>
            </div>
            {driver.penaltiesHistory.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">{t("penalties.noneSeason")}</p>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {driver.penaltiesHistory.map((penalty) => (
                  <div
                    key={penalty.id}
                    className="text-xs border border-[var(--color-border)] rounded-lg px-2 py-2"
                  >
                    <div className="font-medium">
                      {penalty.raceName} •{" "}
                      {new Date(penalty.raceDate).toLocaleDateString(
                        locale === "de" ? "de-DE" : "en-US",
                      )}
                    </div>
                    <div className="text-[var(--color-muted)]">
                      {penalty.type === "points"
                        ? `${t("penalties.detailPoints")}: -${penalty.value}`
                        : penalty.type === "seconds"
                          ? `${t("penalties.detailSeconds")}: ${penalty.value}s`
                          : `${t("penalties.detailGrid")}: +${penalty.value}`}
                    </div>
                    {penalty.note && (
                      <div className="text-[var(--color-muted)]">
                        {t("penalties.notePrefix")} {penalty.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
