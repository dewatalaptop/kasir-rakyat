import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  SheetsAuthExpiredError,
  SheetsNotFoundError,
  connectGoogleSheets,
  getStoredAccessToken,
  getStoredTokenExpiry,
  isStoredTokenExpired,
  onAccessTokenStored,
  onSheetsProblem,
} from "../lib/sheets";
import { ensureAppSpreadsheet, getSettings, setSettings as saveSettings } from "../lib/sheetsStore";
import { checkLicense, type PlanStatus } from "../lib/license";
import { flushPendingQueue } from "../lib/checkout";
import { pendingCount } from "../lib/pendingQueue";
import { describeError } from "../lib/errors";
import { OWNER_UID_KEY, SETTINGS_CACHE_KEY, SPREADSHEET_ID_KEY, clearLocalSession, readStored, writeStored } from "../lib/session";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/ui/Toast";
import type { Pengaturan } from "../types";

const DEFAULT_SETTINGS: Pengaturan = {
  businessName: "",
  businessType: "lainnya",
  address: "",
  phone: "",
  accentHue: 28,
  mejaEnabled: false,
  taxPercent: 0,
  serviceChargePercent: 0,
  receiptFooterText: "Terima kasih atas kunjungan Anda!",
  printerPref: "rawbt",
  fotoStorage: "internal",
  onboardingCompleted: false,
  sheetCreatedAt: "",
  adminPasswordHash: "",
};

// What is wrong with the Google Sheets connection, if anything:
//   "reauth"        — the Google access token expired (they last ~1 hour and
//                     cannot be refreshed silently), or was never obtained.
//   "sheet-missing" — the spreadsheet id we have cached no longer resolves
//                     (deleted in Drive, or a different Google account).
export type ConnectionIssue = "reauth" | "sheet-missing" | null;

interface SettingsContextValue {
  accessToken: string | null;
  spreadsheetId: string | null;
  settings: Pengaturan;
  // True only when a token AND spreadsheet exist AND the token is believed
  // valid. A stale token is "not connected", so nothing treats it as usable.
  connected: boolean;
  loading: boolean;
  error: string | null;
  issue: ConnectionIssue;
  needsReauth: boolean;
  connect: (businessName?: string) => Promise<void>;
  refresh: () => Promise<void>;
  // Re-run the settings load after a transient failure (offline, rate limit).
  retryLoad: () => Promise<void>;
  updateSettings: (patch: Partial<Record<string, string>>) => Promise<void>;
  // Fixes whatever `issue` is: asks Google for a fresh token (must be called
  // straight from a click — it opens a popup) and, if the spreadsheet is gone,
  // finds or recreates it. Then flushes any sales queued while disconnected.
  reconnect: () => Promise<void>;
  // Real plan status — checked server-side against Studio's own payment
  // records (see src/lib/license.ts), not something this app can set
  // itself. Defaults to "gratis" while the check is in flight or on
  // failure — never fail open into paid features.
  plan: PlanStatus;
  planExpiresAt: string | null;
  planLoading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

// Last successfully loaded settings, so a returning user who opens the app
// offline (or with an expired token) still gets in — without it, defaults make
// onboardingCompleted false and the guard would throw them back into
// onboarding.
function readSettingsCache(): Pengaturan {
  try {
    const raw = readStored(SETTINGS_CACHE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Pengaturan>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { show } = useToast();
  const uid = user?.uid ?? null;
  const [accessToken, setAccessToken] = useState<string | null>(getStoredAccessToken());
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(readStored(SPREADSHEET_ID_KEY));
  const [settings, setSettingsState] = useState<Pengaturan>(readSettingsCache);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issue, setIssue] = useState<ConnectionIssue>(null);
  const [plan, setPlan] = useState<PlanStatus>("gratis");
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  const loadSettings = useCallback(async (token: string, sheetId: string) => {
    const partial = await getSettings(token, sheetId);
    setSettingsState((prev) => {
      const next = { ...prev, ...partial };
      writeStored(SETTINGS_CACHE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Translate a failed load into UI state. Auth/sheet problems become an
  // `issue` with a working fix button; anything else is a plain retryable
  // error. Never leaves `loading` hanging.
  const recordLoadFailure = useCallback((err: unknown) => {
    if (err instanceof SheetsAuthExpiredError) setIssue("reauth");
    else if (err instanceof SheetsNotFoundError) setIssue("sheet-missing");
    else setError(describeError(err).message);
  }, []);

  // Bootstrap — runs once auth is known, and again whenever the signed-in
  // account changes (login / logout / switching accounts). Reading storage
  // only at first mount was a bug: signing out and back in kept the previous
  // account's stale token and spreadsheet id in memory.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      if (!uid) {
        setAccessToken(null);
        setSpreadsheetId(null);
        setSettingsState(DEFAULT_SETTINGS);
        setIssue(null);
        setError(null);
        setLoading(false);
        return;
      }
      const owner = readStored(OWNER_UID_KEY);
      if (owner && owner !== uid) {
        // Different Google account than the one this device's cache belongs to.
        clearLocalSession();
        setSettingsState(DEFAULT_SETTINGS);
      }
      writeStored(OWNER_UID_KEY, uid);

      const token = getStoredAccessToken();
      const sheetId = readStored(SPREADSHEET_ID_KEY);
      setAccessToken(token);
      setSpreadsheetId(sheetId);
      setError(null);
      setIssue(null);
      if (sheetId && (!token || isStoredTokenExpired())) {
        // Known-dead token: don't waste a request just to be told 401.
        setIssue("reauth");
      } else if (token && sheetId) {
        try {
          await loadSettings(token, sheetId);
        } catch (err) {
          // Ignore a failure from a token that has since been replaced.
          if (!cancelled && getStoredAccessToken() === token) recordLoadFailure(err);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, authLoading, loadSettings, recordLoadFailure]);

  // Any Sheets/Drive call in the app that hits 401/404 lands here (see
  // reportSheetsProblem in sheets.ts), so a session that dies mid-shift
  // surfaces the reconnect banner instead of a pile of confusing errors.
  useEffect(() => {
    const offToken = onAccessTokenStored((token) => {
      setAccessToken(token);
      setIssue((prev) => (prev === "reauth" ? null : prev));
    });
    const offProblem = onSheetsProblem((problem, failedToken) => {
      if (failedToken !== getStoredAccessToken()) return; // already replaced
      setIssue(problem === "auth-expired" ? "reauth" : "sheet-missing");
    });
    return () => {
      offToken();
      offProblem();
    };
  }, []);

  // Flag expiry proactively — when the clock runs out, and when a
  // sleeping tab/phone wakes up (timers don't fire while suspended) — rather
  // than waiting for the next request to fail.
  useEffect(() => {
    if (!accessToken || !spreadsheetId) return;
    const check = () => {
      if (isStoredTokenExpired()) setIssue((prev) => prev ?? "reauth");
    };
    const expiry = getStoredTokenExpiry() ?? 0;
    const delay = Math.min(Math.max(expiry - Date.now(), 0), 2 ** 31 - 1);
    const timer = setTimeout(check, delay + 500);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [accessToken, spreadsheetId]);

  // Only fires once a real signed-in user exists (the httpsCallable
  // needs a valid ID token) — this is independent of the Sheets
  // connection above, so plan status resolves even before onboarding.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const result = await checkLicense();
      if (!cancelled) {
        setPlan(result.plan);
        setPlanExpiresAt(result.expiresAt);
        setPlanLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const usable = !!(accessToken && spreadsheetId) && issue !== "reauth";

  // Sales queued while offline / disconnected sync themselves as soon as the
  // connection is healthy again — before, this only happened if someone
  // found the manual button in Pengaturan.
  useEffect(() => {
    if (!usable || !accessToken || !spreadsheetId) return;
    let stopped = false;
    const flush = async () => {
      if (stopped || pendingCount() === 0) return;
      const flushed = await flushPendingQueue(accessToken, spreadsheetId);
      if (!stopped && flushed > 0) show(`${flushed} transaksi tertunda berhasil disinkron.`, "success");
    };
    void flush();
    const interval = setInterval(flush, 60_000);
    window.addEventListener("online", flush);
    return () => {
      stopped = true;
      clearInterval(interval);
      window.removeEventListener("online", flush);
    };
  }, [usable, accessToken, spreadsheetId, show]);

  const persistSpreadsheet = useCallback((sheetId: string) => {
    writeStored(SPREADSHEET_ID_KEY, sheetId);
    setSpreadsheetId(sheetId);
  }, []);

  const connect = useCallback(
    async (businessName = "") => {
      setError(null);
      // Reuse a still-valid token (the login popup already asked for Sheets
      // access) instead of opening a second Google popup.
      const reusable = accessToken && !isStoredTokenExpired() && getStoredAccessToken() === accessToken;
      const token = reusable ? accessToken : await connectGoogleSheets();
      const sheetId = await ensureAppSpreadsheet(token, businessName);
      persistSpreadsheet(sheetId);
      setAccessToken(token);
      setIssue(null);
      await loadSettings(token, sheetId);
    },
    [accessToken, loadSettings, persistSpreadsheet]
  );

  const reconnect = useCallback(async () => {
    setError(null);
    // First statement on purpose: the Google popup must open synchronously
    // inside the click handler or browsers block it.
    const token = await connectGoogleSheets();
    setAccessToken(token);
    let sheetId = spreadsheetId;
    try {
      if (!sheetId) throw new SheetsNotFoundError();
      await loadSettings(token, sheetId);
    } catch (err) {
      if (!(err instanceof SheetsNotFoundError)) throw err;
      // The cached spreadsheet is gone (or belongs to another account): find
      // the app's spreadsheet by name, or create a fresh one.
      sheetId = await ensureAppSpreadsheet(token, "");
      persistSpreadsheet(sheetId);
      await loadSettings(token, sheetId);
    }
    setIssue(null);
    if (pendingCount() > 0) {
      const flushed = await flushPendingQueue(token, sheetId);
      if (flushed > 0) show(`${flushed} transaksi tertunda berhasil disinkron.`, "success");
    }
  }, [spreadsheetId, loadSettings, persistSpreadsheet, show]);

  const retryLoad = useCallback(async () => {
    if (!accessToken || !spreadsheetId) return;
    setError(null);
    setLoading(true);
    try {
      await loadSettings(accessToken, spreadsheetId);
    } catch (err) {
      recordLoadFailure(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, spreadsheetId, loadSettings, recordLoadFailure]);

  const refresh = useCallback(async () => {
    if (!accessToken || !spreadsheetId) return;
    await loadSettings(accessToken, spreadsheetId);
  }, [accessToken, spreadsheetId, loadSettings]);

  const updateSettings = useCallback(
    async (patch: Partial<Record<string, string>>) => {
      if (!accessToken || !spreadsheetId) return;
      await saveSettings(accessToken, spreadsheetId, patch as Record<string, string>);
      await loadSettings(accessToken, spreadsheetId);
    },
    [accessToken, spreadsheetId, loadSettings]
  );

  return (
    <SettingsContext.Provider
      value={{
        accessToken,
        spreadsheetId,
        settings,
        connected: usable,
        loading,
        error,
        issue,
        needsReauth: issue === "reauth",
        connect,
        refresh,
        retryLoad,
        updateSettings,
        plan,
        planExpiresAt,
        planLoading,
        reconnect,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
