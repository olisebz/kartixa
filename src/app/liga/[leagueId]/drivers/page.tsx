"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Medal,
  Loader2,
} from "lucide-react";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/Table";
import { api } from "@/lib/api";
import { useLocale } from "@/LocaleContext";
import type { LeagueDetailDTO, DriverDTO } from "@/server/domain/dto";

export default function DriversPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const { t, locale } = useLocale();

  const [league, setLeague] = useState<LeagueDetailDTO | null>(null);
  const [drivers, setDrivers] = useState<DriverDTO[]>([]);
  const [seasonId, setSeasonId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Edit modal state
  const [editingDriver, setEditingDriver] = useState<DriverDTO | null>(null);
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editTeamId, setEditTeamId] = useState("");

  // Add driver state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverNumber, setNewDriverNumber] = useState("");
  const [newDriverTeamId, setNewDriverTeamId] = useState("");
  const [addError, setAddError] = useState("");

  // Success message
  const [successMessage, setSuccessMessage] = useState("");

  // Error message for edit modal
  const [editError, setEditError] = useState("");

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<DriverDTO | null>(null);

  // Error message for delete
  const [deleteError, setDeleteError] = useState("");

  // Load league and drivers
  useEffect(() => {
    api.leagues
      .get(leagueId)
      .then(async (leagueData) => {
        setLeague(leagueData);
        if (leagueData.currentUserRole === "member") {
          setPageError(t("common.insufficientPermissions"));
          return;
        }

        const activeSeason =
          leagueData.seasons.find((s) => s.isActive) ||
          leagueData.seasons[leagueData.seasons.length - 1];
        if (activeSeason) {
          setSeasonId(activeSeason.id);
          const driversData = await api.drivers.list(leagueId, activeSeason.id);
          setDrivers(driversData);
        }
      })
      .catch((err) => {
        if (err.status === 404) {
          notFound();
        }
        setPageError(err.message);
      })
      .finally(() => setLoading(false));
  }, [leagueId, t]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const reloadDrivers = async () => {
    if (!seasonId) return;
    try {
      const data = await api.drivers.list(leagueId, seasonId);
      setDrivers(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("common.failedLoad");
      setDeleteError(message);
    }
  };

  const handleAddDriver = async () => {
    if (!newDriverName.trim()) {
      setAddError(t("drivers.nameRequired"));
      return;
    }

    if (
      drivers.some(
        (d) => d.name.toLowerCase() === newDriverName.trim().toLowerCase(),
      )
    ) {
      setAddError(t("drivers.nameExists"));
      return;
    }

    try {
      const parsedNumber = newDriverNumber.trim()
        ? Number.parseInt(newDriverNumber.trim(), 10)
        : undefined;

      if (parsedNumber !== undefined && Number.isNaN(parsedNumber)) {
        setAddError(t("drivers.invalidNumber"));
        return;
      }

      const newDriver = await api.drivers.create(leagueId, seasonId, {
        name: newDriverName.trim(),
        ...(parsedNumber ? { number: parsedNumber } : {}),
        ...(newDriverTeamId ? { teamId: newDriverTeamId } : {}),
      });
      setDrivers([...drivers, newDriver]);
      setNewDriverName("");
      setNewDriverNumber("");
      setNewDriverTeamId("");
      setShowAddForm(false);
      setAddError("");
      showSuccess(`${newDriver.name} has been added!`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("common.failedLoad");
      setAddError(message);
    }
  };

  const handleEditDriver = (driver: DriverDTO) => {
    setEditingDriver(driver);
    setEditName(driver.name);
    setEditNumber(String(driver.number));
    setEditTeamId(driver.teamId ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editingDriver || !editName.trim()) return;

    if (
      drivers.some(
        (d) =>
          d.id !== editingDriver.id &&
          d.name.toLowerCase() === editName.trim().toLowerCase(),
      )
    ) {
      setEditError(t("drivers.nameExists"));
      return;
    }

    try {
      const parsedNumber = Number.parseInt(editNumber.trim(), 10);

      if (Number.isNaN(parsedNumber)) {
        setEditError(t("drivers.invalidNumber"));
        return;
      }

      await api.drivers.update(leagueId, seasonId, editingDriver.id, {
        name: editName.trim(),
        number: parsedNumber,
        teamId: editTeamId || null,
      });
      showSuccess(`Driver renamed to ${editName.trim()}`);
      setEditingDriver(null);
      setEditName("");
      setEditNumber("");
      setEditTeamId("");
      setEditError("");
      await reloadDrivers();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("common.failedLoad");
      setEditError(message);
    }
  };

  const handleDeleteDriver = (driver: DriverDTO) => {
    if (driver.races > 0) {
      setDeleteError(t("drivers.cannotDelete"));
      setTimeout(() => setDeleteError(""), 5000);
      return;
    }

    setDeleteConfirm(driver);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.drivers.delete(leagueId, seasonId, deleteConfirm.id);
      showSuccess(`${deleteConfirm.name} has been removed`);
      setDeleteConfirm(null);
      await reloadDrivers();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("common.failedLoad");
      setDeleteError(message);
      setDeleteConfirm(null);
    }
  };

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (pageError || !league) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-600 mb-4">
          {t("common.failedLoad")}: {pageError}
        </p>
        <Button onClick={() => window.location.reload()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  // Sort drivers by points
  const sortedDrivers = [...drivers].sort(
    (a, b) => b.totalPoints - a.totalPoints,
  );
  const teamOptions = [
    { value: "", label: t("teams.none") },
    ...(league.teams ?? [])
      .filter((team) => team.isActive)
      .map((team) => ({ value: team.id, label: team.name })),
  ];

  return (
    <div className="py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Button
          href={`/liga/${leagueId}`}
          variant="secondary"
          size="sm"
          className="mb-4"
        >
          {t("race.backToLeague")}
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <Users className="w-8 h-8" />
              {t("drivers.manage")}
            </h1>
            <p className="text-[var(--color-muted)] mt-1">
              {league.name} • {drivers.length}{" "}
              {t("league.drivers").toLowerCase()}
            </p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-5 h-5 mr-2" />
            {t("drivers.add")}
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 flex items-center gap-2">
          <Check className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Delete Error Message */}
      {deleteError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-center gap-2">
          <X className="w-5 h-5" />
          {deleteError}
        </div>
      )}

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={t("drivers.deleteConfirmTitle")}
        footer={
          <div className="flex gap-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setDeleteConfirm(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              className="flex-1 bg-[var(--color-delete)] hover:bg-red-700"
              onClick={confirmDelete}
            >
              {t("common.delete")}
            </Button>
          </div>
        }
      >
        <p className="text-[var(--color-muted)]">
          {t("drivers.deleteConfirmMsg")}
        </p>
      </Modal>

      {/* Add Driver Form */}
      {showAddForm && (
        <div className="mb-6 bg-[var(--color-card)] rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            {t("drivers.addNew")}
          </h2>
          <div className="flex gap-4 items-end flex-wrap sm:flex-nowrap">
            <div className="flex-1 min-w-[160px]">
              <Input
                label={t("drivers.driverName")}
                value={newDriverName}
                onChange={(e) => {
                  setNewDriverName(e.target.value);
                  setAddError("");
                }}
                placeholder={t("drivers.driverName")}
                error={addError}
              />
            </div>
            <div className="w-36">
              <Input
                label={t("drivers.number")}
                type="number"
                min="1"
                max="999"
                value={newDriverNumber}
                onChange={(e) => setNewDriverNumber(e.target.value)}
                placeholder="Auto"
              />
            </div>
            <div className="w-52">
              <Select
                label={t("teams.label")}
                options={teamOptions}
                value={newDriverTeamId}
                onChange={(e) => setNewDriverTeamId(e.target.value)}
              />
            </div>
            <Button onClick={handleAddDriver}>{t("drivers.add")}</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddForm(false);
                setNewDriverName("");
                setNewDriverNumber("");
                setNewDriverTeamId("");
                setAddError("");
              }}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* Drivers Table */}
      <div className="bg-[var(--color-card)] rounded-2xl p-6">
        {sortedDrivers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t("drivers.rank")}</TableHead>
                <TableHead>{t("league.nameLabel")}</TableHead>
                <TableHead>{t("teams.label")}</TableHead>
                <TableHead className="text-center">#</TableHead>
                <TableHead className="text-center">
                  {t("drivers.races")}
                </TableHead>
                <TableHead className="text-center">
                  {t("drivers.wins")}
                </TableHead>
                <TableHead className="text-right">
                  {t("drivers.points")}
                </TableHead>
                <TableHead className="w-32 text-right">
                  {t("drivers.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDrivers.map((driver, index) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">
                    {index + 1 <= 3 ? (
                      <span className="flex items-center gap-1">
                        <Medal
                          className={`w-5 h-5 ${
                            index + 1 === 1
                              ? "text-yellow-500"
                              : index + 1 === 2
                                ? "text-gray-400"
                                : "text-amber-700"
                          }`}
                        />
                        {index + 1}
                      </span>
                    ) : (
                      index + 1
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{driver.name}</TableCell>
                  <TableCell>{driver.teamName ?? "-"}</TableCell>
                  <TableCell className="text-center font-medium">
                    {driver.number}
                  </TableCell>
                  <TableCell className="text-center">{driver.races}</TableCell>
                  <TableCell className="text-center">{driver.wins}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {driver.totalPoints}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditDriver(driver)}
                        className="text-[var(--color-primary)] hover:underline text-sm flex items-center gap-1"
                      >
                        <Edit2 className="w-4 h-4" />
                        {t("common.edit")}
                      </button>
                      <button
                        onClick={() => handleDeleteDriver(driver)}
                        className="text-[var(--color-delete)] hover:underline text-sm flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={driver.races > 0}
                        title={
                          driver.races > 0
                            ? t("drivers.cannotDelete")
                            : t("common.delete")
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                        {t("common.delete")}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-[var(--color-muted)]" />
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
              {t("drivers.noDriversYetTitle")}
            </h3>
            <p className="text-[var(--color-muted)] mb-6">
              {t("drivers.noDriversYetMsg")}
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              {t("drivers.addFirst")}
            </Button>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {sortedDrivers.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-primary)]">
              {sortedDrivers.length}
            </div>
            <div className="text-sm text-[var(--color-muted)]">
              {t("drivers.totalDrivers")}
            </div>
          </div>
          <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-primary)]">
              {sortedDrivers.reduce((sum, d) => sum + d.totalPoints, 0)}
            </div>
            <div className="text-sm text-[var(--color-muted)]">
              {t("drivers.totalPoints")}
            </div>
          </div>
          <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-primary)]">
              {sortedDrivers.reduce((sum, d) => sum + d.races, 0)}
            </div>
            <div className="text-sm text-[var(--color-muted)]">
              {t("drivers.raceEntries")}
            </div>
          </div>
          <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-primary)]">
              {sortedDrivers.reduce((sum, d) => sum + d.wins, 0)}
            </div>
            <div className="text-sm text-[var(--color-muted)]">
              {t("drivers.totalWins")}
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!editingDriver}
        onClose={() => setEditingDriver(null)}
        title={t("drivers.editDriver")}
        footer={
          <div className="flex gap-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setEditingDriver(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button className="flex-1" onClick={handleSaveEdit}>
              {t("drivers.saveChanges")}
            </Button>
          </div>
        }
      >
        <Input
          label={t("drivers.driverName")}
          value={editName}
          onChange={(e) => {
            setEditName(e.target.value);
            setEditError("");
          }}
          placeholder={t("drivers.driverName")}
          error={editError}
        />

        <div className="mt-4">
          <Input
            label={t("drivers.number")}
            type="number"
            min="1"
            max="999"
            value={editNumber}
            onChange={(e) => {
              setEditNumber(e.target.value);
              setEditError("");
            }}
          />
        </div>

        <div className="mt-4">
          <Select
            label={t("teams.label")}
            options={teamOptions}
            value={editTeamId}
            onChange={(e) => {
              setEditTeamId(e.target.value);
              setEditError("");
            }}
          />
        </div>

        {editingDriver && (
          <div className="mt-4 p-4 bg-[var(--color-card)] rounded-xl">
            <div className="text-sm text-[var(--color-muted)] space-y-1">
              <div className="flex justify-between">
                <span>{t("drivers.totalPoints")}:</span>
                <span className="font-medium">{editingDriver.totalPoints}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("drivers.races")}:</span>
                <span className="font-medium">{editingDriver.races}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("drivers.number")}:</span>
                <span className="font-medium">{editingDriver.number}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("drivers.wins")}:</span>
                <span className="font-medium">{editingDriver.wins}</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center mb-2 text-sm text-[var(--color-muted)]">
                <span>{t("penalties.history")}</span>
                <span className="font-medium">
                  {editingDriver.penaltiesHistory.length}
                </span>
              </div>

              {editingDriver.penaltiesHistory.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)]">
                  {t("penalties.noneSeason")}
                </p>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {editingDriver.penaltiesHistory.map((penalty) => (
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
      </Modal>
    </div>
  );
}
