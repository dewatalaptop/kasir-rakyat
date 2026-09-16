import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { connectGoogleSheets, getStoredAccessToken } from "../lib/sheets";
import { ensureAppSpreadsheet, getSettings, setSettings as saveSettings } from "../lib/sheetsStore";
import type { Pengaturan } from "../types";

const SPREADSHEET_ID_KEY = "kasirRakyat.spreadsheetId";

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
  onboardingCompleted: false,
  sheetCreatedAt: "",
};

interface SettingsContextValue {
  accessToken: string | null;
  spreadsheetId: string | null;
  settings: Pengaturan;
  connected: boolean;
  loading: boolean;
  error: string | null;
  connect: (businessName?: string) => Promise<void>;
  refresh: () => Promise<void>;
  updateSettings: (patch: Partial<Record<string, string>>) => Promise<void>;
  reconnect: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(getStoredAccessToken());
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(localStorage.getItem(SPREADSHEET_ID_KEY));
  const [settings, setSettingsState] = useState<Pengaturan>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async (token: string, sheetId: string) => {
    const partial = await getSettings(token, sheetId);
    setSettingsState((prev) => ({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    (async () => {
      if (accessToken && spreadsheetId) {
        try {
          await loadSettings(accessToken, spreadsheetId);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Gagal memuat pengaturan.");
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(async (businessName = "") => {
    setError(null);
    const token = await connectGoogleSheets();
    const sheetId = await ensureAppSpreadsheet(token, businessName);
    localStorage.setItem(SPREADSHEET_ID_KEY, sheetId);
    setAccessToken(token);
    setSpreadsheetId(sheetId);
    await loadSettings(token, sheetId);
  }, [loadSettings]);

  const reconnect = useCallback(async () => {
    setError(null);
    const token = await connectGoogleSheets();
    setAccessToken(token);
    if (spreadsheetId) await loadSettings(token, spreadsheetId);
  }, [spreadsheetId, loadSettings]);

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
        connected: !!(accessToken && spreadsheetId),
        loading,
        error,
        connect,
        refresh,
        updateSettings,
        reconnect,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
