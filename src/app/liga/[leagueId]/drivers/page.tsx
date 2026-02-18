"use client";

import { useState, useId } from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { Users, Plus, Edit2, Trash2, Check, X, Medal } from "lucide-react";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/Table";
import { getLeagueById } from "@/lib/mockData";
import type { Driver } from "@/lib/mockData";

export default function DriversPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;
  const league = getLeagueById(leagueId);

  if (!league) {
    notFound();
  }

  // Get the active season (or the most recent one)
  const activeSeason =
    league.seasons.find((s) => s.isActive) ||
    league.seasons[league.seasons.length - 1];

  if (!activeSeason) {
    notFound();
  }

  const baseId = useId();
  const [driverIdCounter, setDriverIdCounter] = useState(
    activeSeason.drivers.length,
  );

  // Local drivers state (copy of season drivers for editing)
  const [drivers, setDrivers] = useState<Driver[]>([...activeSeason.drivers]);

  // Edit modal state
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editName, setEditName] = useState("");

  // Add driver state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [addError, setAddError] = useState("");

  // Success message
  const [successMessage, setSuccessMessage] = useState("");

  // Error message for edit modal
  const [editError, setEditError] = useState("");

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<Driver | null>(null);

  // Error message for delete
  const [deleteError, setDeleteError] = useState("");

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleAddDriver = () => {
    if (!newDriverName.trim()) {
      setAddError("Driver name is required");
      return;
    }

    if (
      drivers.some(
        (d) => d.name.toLowerCase() === newDriverName.trim().toLowerCase(),
      )
    ) {
      setAddError("A driver with this name already exists");
      return;
    }

    const newDriver: Driver = {
      id: `${baseId}-driver-${driverIdCounter}`,
      name: newDriverName.trim(),
      totalPoints: 0,
      races: 0,
      wins: 0,
    };

    setDrivers([...drivers, newDriver]);
    setDriverIdCounter((c) => c + 1);
    setNewDriverName("");
    setShowAddForm(false);
    setAddError("");
    showSuccess(`${newDriver.name} has been added!`);
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setEditName(driver.name);
  };

  const handleSaveEdit = () => {
    if (!editingDriver || !editName.trim()) return;

    if (
      drivers.some(
        (d) =>
          d.id !== editingDriver.id &&
          d.name.toLowerCase() === editName.trim().toLowerCase(),
      )
    ) {
      setEditError("A driver with this name already exists");
      return;
    }

    setDrivers(
      drivers.map((d) =>
        d.id === editingDriver.id ? { ...d, name: editName.trim() } : d,
      ),
    );
    showSuccess(`Driver renamed to ${editName.trim()}`);
    setEditingDriver(null);
    setEditName("");
    setEditError("");
  };

  const handleDeleteDriver = (driver: Driver) => {
    if (driver.races > 0) {
      setDeleteError(
        `Cannot delete ${driver.name} because they have participated in ${driver.races} race(s). This would affect race history.`,
      );
      setTimeout(() => setDeleteError(""), 5000);
      return;
    }

    setDeleteConfirm(driver);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    setDrivers(drivers.filter((d) => d.id !== deleteConfirm.id));
    showSuccess(`${deleteConfirm.name} has been removed`);
    setDeleteConfirm(null);
  };

  // Sort drivers by points
  const sortedDrivers = [...drivers].sort(
    (a, b) => b.totalPoints - a.totalPoints,
  );

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          href={`/liga/${leagueId}`}
          variant="secondary"
          size="sm"
          className="mb-4"
        >
          ← Back to League
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <Users className="w-8 h-8" />
              Manage Drivers
            </h1>
            <p className="text-[var(--color-muted)] mt-1">
              {league.name} • {drivers.length} driver
              {drivers.length !== 1 && "s"}
            </p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Add Driver
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
        title="Delete Driver?"
        footer={
          <div className="flex gap-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-[var(--color-delete)] hover:bg-red-700"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-[var(--color-muted)]">
          Are you sure you want to remove <strong>{deleteConfirm?.name}</strong>{" "}
          from this league? This action cannot be undone.
        </p>
      </Modal>

      {/* Add Driver Form */}
      {showAddForm && (
        <div className="mb-6 bg-[var(--color-card)] rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            Add New Driver
          </h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                label="Driver Name"
                value={newDriverName}
                onChange={(e) => {
                  setNewDriverName(e.target.value);
                  setAddError("");
                }}
                placeholder="Enter driver name"
                error={addError}
              />
            </div>
            <Button onClick={handleAddDriver}>Add</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddForm(false);
                setNewDriverName("");
                setAddError("");
              }}
            >
              Cancel
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
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Races</TableHead>
                <TableHead className="text-center">Wins</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
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
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDriver(driver)}
                        className="text-[var(--color-delete)] hover:underline text-sm flex items-center gap-1"
                        disabled={driver.races > 0}
                        title={
                          driver.races > 0
                            ? "Cannot delete driver with race history"
                            : "Delete driver"
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
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
              No Drivers Yet
            </h3>
            <p className="text-[var(--color-muted)] mb-6">
              Add your first driver to start tracking standings.
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              Add First Driver
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
              Total Drivers
            </div>
          </div>
          <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-primary)]">
              {sortedDrivers.reduce((sum, d) => sum + d.totalPoints, 0)}
            </div>
            <div className="text-sm text-[var(--color-muted)]">
              Total Points
            </div>
          </div>
          <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-primary)]">
              {sortedDrivers.reduce((sum, d) => sum + d.races, 0)}
            </div>
            <div className="text-sm text-[var(--color-muted)]">
              Race Entries
            </div>
          </div>
          <div className="bg-[var(--color-card)] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-primary)]">
              {sortedDrivers.reduce((sum, d) => sum + d.wins, 0)}
            </div>
            <div className="text-sm text-[var(--color-muted)]">Total Wins</div>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!editingDriver}
        onClose={() => setEditingDriver(null)}
        title="Edit Driver"
        footer={
          <div className="flex gap-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setEditingDriver(null)}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSaveEdit}>
              Save
            </Button>
          </div>
        }
      >
        <Input
          label="Driver Name"
          value={editName}
          onChange={(e) => {
            setEditName(e.target.value);
            setEditError("");
          }}
          placeholder="Enter driver name"
          error={editError}
        />

        {editingDriver && (
          <div className="mt-4 p-4 bg-[var(--color-card)] rounded-xl">
            <div className="text-sm text-[var(--color-muted)] space-y-1">
              <div className="flex justify-between">
                <span>Total Points:</span>
                <span className="font-medium">{editingDriver.totalPoints}</span>
              </div>
              <div className="flex justify-between">
                <span>Races:</span>
                <span className="font-medium">{editingDriver.races}</span>
              </div>
              <div className="flex justify-between">
                <span>Wins:</span>
                <span className="font-medium">{editingDriver.wins}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
