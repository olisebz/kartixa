"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { DriverDTO } from "@/server/domain/dto";

interface UseDriversOptions {
  leagueId: string;
  seasonId: string;
}

interface UseDriversReturn {
  drivers: DriverDTO[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addDriver: (input: { name: string; number?: number; teamId?: string }) => Promise<DriverDTO>;
  updateDriver: (driverId: string, input: { name: string; number: number; teamId: string | null }) => Promise<void>;
  deleteDriver: (driverId: string) => Promise<void>;
}

export function useDrivers({ leagueId, seasonId }: UseDriversOptions): UseDriversReturn {
  const [drivers, setDrivers] = useState<DriverDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    if (!seasonId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.drivers.list(leagueId, seasonId);
      setDrivers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (seasonId) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, seasonId]);

  const addDriver = async (input: { name: string; number?: number; teamId?: string }) => {
    const driver = await api.drivers.create(leagueId, seasonId, input);
    setDrivers((prev) => [...prev, driver]);
    return driver;
  };

  const updateDriver = async (
    driverId: string,
    input: { name: string; number: number; teamId: string | null },
  ) => {
    await api.drivers.update(leagueId, seasonId, driverId, input);
    await reload();
  };

  const deleteDriver = async (driverId: string) => {
    await api.drivers.delete(leagueId, seasonId, driverId);
    await reload();
  };

  return { drivers, loading, error, reload, addDriver, updateDriver, deleteDriver };
}
