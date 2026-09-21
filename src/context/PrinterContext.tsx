import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Pengaturan, Transaksi } from "../types";
import { isNativeApp } from "../lib/platform";
import { buildReceiptBytes, buildTestPageBytes, type PaperWidthKey } from "../lib/escpos";
import {
  capacitorBleAdapter,
  findWriteTarget,
  friendlyBleError,
  loadSavedPrinter,
  persistSavedPrinter,
  sendToPrinter,
  type BleAdapter,
  type SavedPrinter,
  type ScannedDevice,
  type WriteTarget,
} from "../lib/bluetoothPrinter";

export type PrinterStatus = "disconnected" | "scanning" | "connecting" | "connected" | "printing" | "error";

interface PrinterContextValue {
  status: PrinterStatus;
  error: string | null;
  devices: ScannedDevice[];
  connectedName: string | null;
  paperWidth: PaperWidthKey;
  autoPrint: boolean;
  // Native (Android app) only: Bluetooth printing needs the native plugin.
  isNative: boolean;
  isConnected: boolean;
  scan: () => Promise<void>;
  stopScan: () => Promise<void>;
  connect: (device: ScannedDevice) => Promise<void>;
  disconnect: () => Promise<void>;
  setPaperWidth: (w: PaperWidthKey) => void;
  setAutoPrint: (v: boolean) => void;
  printReceipt: (t: Transaksi, p: Pengaturan, watermark: boolean) => Promise<void>;
  printTestPage: (businessName: string) => Promise<void>;
}

const PrinterContext = createContext<PrinterContextValue | null>(null);

export function usePrinter(): PrinterContextValue {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error("usePrinter must be used within PrinterProvider");
  return ctx;
}

// `adapter` is injectable so the whole provider can be exercised against a
// fake printer in tests; the app always uses the real Capacitor plugin.
export function PrinterProvider({ children, adapter = capacitorBleAdapter }: { children: ReactNode; adapter?: BleAdapter }) {
  const isNative = isNativeApp();
  const [status, setStatus] = useState<PrinterStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [connected, setConnected] = useState<ScannedDevice | null>(null);
  const [paperWidth, setPaperWidthState] = useState<PaperWidthKey>(() => loadSavedPrinter()?.paperWidth ?? "58");
  const [autoPrint, setAutoPrintState] = useState<boolean>(() => loadSavedPrinter()?.autoPrint ?? false);

  const targetRef = useRef<WriteTarget | null>(null);
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef<SavedPrinter | null>(loadSavedPrinter());

  const onDisconnected = useCallback(() => {
    setStatus("disconnected");
    setConnected(null);
    targetRef.current = null;
  }, []);

  // Silently reconnect the saved printer on launch. Printer off / out of range
  // is normal, not an error worth showing.
  useEffect(() => {
    const saved = savedRef.current;
    if (!isNative || !saved) return;
    (async () => {
      try {
        setStatus("connecting");
        await adapter.initialize();
        await adapter.connect(saved.deviceId, onDisconnected);
        const target = await findWriteTarget(adapter, saved.deviceId);
        if (!target) throw new Error("not a supported printer");
        targetRef.current = target;
        setConnected({ deviceId: saved.deviceId, name: saved.name });
        setStatus("connected");
      } catch {
        setStatus("disconnected");
      }
    })();
  }, [isNative, adapter, onDisconnected]);

  const stopScan = useCallback(async () => {
    if (scanTimer.current) clearTimeout(scanTimer.current);
    try {
      await adapter.stopLEScan();
    } catch {
      /* already stopped */
    }
    setStatus((s) => (s === "scanning" ? "disconnected" : s));
  }, [adapter]);

  const scan = useCallback(async () => {
    setError(null);
    setDevices([]);
    try {
      await adapter.initialize();
      setStatus("scanning");
      const seen = new Map<string, ScannedDevice>();
      await adapter.requestLEScan((d) => {
        if (!d.name) return; // unnamed devices are never receipt printers
        seen.set(d.deviceId, d);
        setDevices([...seen.values()]);
      });
      scanTimer.current = setTimeout(() => void stopScan(), 10_000);
    } catch (err) {
      setStatus("error");
      setError(friendlyBleError(err, "Tidak bisa mulai mencari printer"));
    }
  }, [adapter, stopScan]);

  const persist = useCallback((patch: Partial<SavedPrinter> & { deviceId?: string; name?: string }) => {
    const base = savedRef.current;
    const next = { deviceId: "", name: "Printer", paperWidth: "58" as PaperWidthKey, autoPrint: false, ...base, ...patch };
    if (!next.deviceId) return; // nothing to remember yet
    savedRef.current = next;
    persistSavedPrinter(next);
  }, []);

  const connect = useCallback(
    async (device: ScannedDevice) => {
      await stopScan();
      setError(null);
      setStatus("connecting");
      try {
        await adapter.connect(device.deviceId, onDisconnected);
        const target = await findWriteTarget(adapter, device.deviceId);
        if (!target) {
          await adapter.disconnect(device.deviceId).catch(() => {});
          throw new Error("Perangkat ini terdeteksi tapi sepertinya bukan printer thermal yang didukung");
        }
        targetRef.current = target;
        setConnected(device);
        setStatus("connected");
        persist({ deviceId: device.deviceId, name: device.name || "Printer", paperWidth, autoPrint });
      } catch (err) {
        setStatus("error");
        setError(friendlyBleError(err, "Gagal terhubung ke printer"));
      }
    },
    [adapter, onDisconnected, stopScan, persist, paperWidth, autoPrint]
  );

  const disconnect = useCallback(async () => {
    if (connected) await adapter.disconnect(connected.deviceId).catch(() => {});
    targetRef.current = null;
    setConnected(null);
    setStatus("disconnected");
    savedRef.current = null;
    persistSavedPrinter(null);
  }, [adapter, connected]);

  const setPaperWidth = useCallback(
    (w: PaperWidthKey) => {
      setPaperWidthState(w);
      persist({ paperWidth: w });
    },
    [persist]
  );

  const setAutoPrint = useCallback(
    (v: boolean) => {
      setAutoPrintState(v);
      persist({ autoPrint: v });
    },
    [persist]
  );

  const send = useCallback(
    async (bytes: Uint8Array) => {
      if (!connected || !targetRef.current) throw new Error("Printer belum terhubung. Buka Pengaturan > Printer untuk menghubungkan.");
      setStatus("printing");
      setError(null);
      try {
        await sendToPrinter(adapter, connected.deviceId, targetRef.current, bytes);
      } catch (err) {
        throw new Error(friendlyBleError(err, "Gagal mencetak"));
      } finally {
        setStatus("connected");
      }
    },
    [adapter, connected]
  );

  const printReceipt = useCallback((t: Transaksi, p: Pengaturan, watermark: boolean) => send(buildReceiptBytes(t, p, { paperWidth, watermark })), [send, paperWidth]);
  const printTestPage = useCallback((businessName: string) => send(buildTestPageBytes(businessName, paperWidth)), [send, paperWidth]);

  return (
    <PrinterContext.Provider
      value={{
        status,
        error,
        devices,
        connectedName: connected?.name ?? null,
        paperWidth,
        autoPrint,
        isNative,
        isConnected: !!connected,
        scan,
        stopScan,
        connect,
        disconnect,
        setPaperWidth,
        setAutoPrint,
        printReceipt,
        printTestPage,
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
}
