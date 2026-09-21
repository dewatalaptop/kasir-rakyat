import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSettings } from "./SettingsContext";
import { useAuth } from "../hooks/useAuth";
import { getKasir, saveKasir } from "../lib/sheetsStore";
import { clearAdminUnlocked, isAdminUnlocked, subscribeAdminLock } from "../lib/adminAuth";
import {
  EMPTY_THROTTLE,
  canAccess,
  lockRemainingMs,
  recordFailure,
  recordSuccess,
  verifyPin,
  type Requirement,
  type ThrottleState,
} from "../lib/permissions";
import { readStored, writeStored } from "../lib/session";
import type { KasirProfil } from "../types";

const ACTIVE_KEY = "kasirRakyat.activeKasir"; // sessionStorage: app restart => PIN again
const CACHE_KEY = "kasirRakyat.kasirCache"; // localStorage: works offline
const THROTTLE_KEY = "kasirRakyat.pinThrottle"; // localStorage: reload doesn't reset the lock

export type LoginResult =
  | { ok: true }
  | { ok: false; reason: "salah"; attemptsLeft: number }
  | { ok: false; reason: "terkunci"; retryInSec: number }
  | { ok: false; reason: "tidak-ada" };

interface AccessValue {
  kasirList: KasirProfil[];
  kasirLoaded: boolean;
  activeKasir: KasirProfil | null;
  isOwner: boolean;
  // Registered kasir exist, and nobody (kasir or owner) has identified yet.
  needsPin: boolean;
  // Name recorded on a sale: the working kasir, else the signed-in Google user.
  actorName: string;
  can: (req: Requirement) => boolean;
  loginKasir: (id: string, pin: string) => Promise<LoginResult>;
  // Ends the current kasir's shift AND re-locks owner mode, so the next person
  // at the register never inherits the previous person's privileges.
  logoutKasir: () => void;
  refreshKasir: () => Promise<void>;
  saveKasirProfil: (k: KasirProfil) => Promise<void>;
}

const AccessContext = createContext<AccessValue | null>(null);

export function useAccess(): AccessValue {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used within AccessProvider");
  return ctx;
}

function readCache(): KasirProfil[] {
  try {
    const raw = readStored(CACHE_KEY);
    return raw ? (JSON.parse(raw) as KasirProfil[]) : [];
  } catch {
    return [];
  }
}

function readThrottle(): Record<string, ThrottleState> {
  try {
    const raw = readStored(THROTTLE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ThrottleState>) : {};
  } catch {
    return {};
  }
}

function readActiveId(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function AccessProvider({ children }: { children: ReactNode }) {
  const { accessToken, spreadsheetId, issue } = useSettings();
  const { user } = useAuth();
  const [kasirList, setKasirList] = useState<KasirProfil[]>(readCache);
  const [kasirLoaded, setKasirLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(readActiveId);
  const isOwner = useSyncExternalStore(subscribeAdminLock, isAdminUnlocked, () => false);

  const load = useCallback(async () => {
    if (!accessToken || !spreadsheetId) return;
    const list = await getKasir(accessToken, spreadsheetId);
    setKasirList(list);
    writeStored(CACHE_KEY, JSON.stringify(list));
    setKasirLoaded(true);
  }, [accessToken, spreadsheetId]);

  useEffect(() => {
    if (!accessToken || !spreadsheetId || issue) return;
    // A failed load (offline / rate limit) keeps the cached list — otherwise a
    // network blip would silently drop the PIN gate.
    load().catch(() => setKasirLoaded(true));
  }, [accessToken, spreadsheetId, issue, load]);

  const activeKasir = useMemo(() => kasirList.find((k) => k.id === activeId && k.aktif) ?? null, [kasirList, activeId]);

  // Deactivated/deleted while working: end the shift.
  useEffect(() => {
    if (activeId && kasirLoaded && !activeKasir) {
      setActiveId(null);
      try {
        sessionStorage.removeItem(ACTIVE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [activeId, activeKasir, kasirLoaded]);

  const needsPin = kasirList.some((k) => k.aktif) && !activeKasir && !isOwner;

  const loginKasir = useCallback(
    async (id: string, pin: string): Promise<LoginResult> => {
      const profile = kasirList.find((k) => k.id === id && k.aktif);
      if (!profile) return { ok: false, reason: "tidak-ada" };
      const all = readThrottle();
      const state = all[id] ?? EMPTY_THROTTLE;
      const wait = lockRemainingMs(state, Date.now());
      if (wait > 0) return { ok: false, reason: "terkunci", retryInSec: Math.ceil(wait / 1000) };

      if (await verifyPin(pin, profile)) {
        all[id] = recordSuccess();
        writeStored(THROTTLE_KEY, JSON.stringify(all));
        try {
          sessionStorage.setItem(ACTIVE_KEY, id);
        } catch {
          /* session-only anyway */
        }
        setActiveId(id);
        return { ok: true };
      }
      const next = recordFailure(state, Date.now());
      all[id] = next;
      writeStored(THROTTLE_KEY, JSON.stringify(all));
      const left = lockRemainingMs(next, Date.now());
      if (left > 0) return { ok: false, reason: "terkunci", retryInSec: Math.ceil(left / 1000) };
      return { ok: false, reason: "salah", attemptsLeft: Math.max(0, 5 - next.failures) };
    },
    [kasirList]
  );

  const logoutKasir = useCallback(() => {
    try {
      sessionStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* ignore */
    }
    setActiveId(null);
    clearAdminUnlocked();
  }, []);

  const saveKasirProfil = useCallback(
    async (k: KasirProfil) => {
      if (!accessToken || !spreadsheetId) throw new Error("Belum terhubung ke Google Sheets.");
      await saveKasir(accessToken, spreadsheetId, k);
      await load();
    },
    [accessToken, spreadsheetId, load]
  );

  const can = useCallback((req: Requirement) => canAccess(req, { isOwner, profile: activeKasir }), [isOwner, activeKasir]);

  const actorName = activeKasir?.nama ?? user?.displayName ?? user?.email ?? "Kasir";

  return (
    <AccessContext.Provider
      value={{ kasirList, kasirLoaded, activeKasir, isOwner, needsPin, actorName, can, loginKasir, logoutKasir, refreshKasir: load, saveKasirProfil }}
    >
      {children}
    </AccessContext.Provider>
  );
}
