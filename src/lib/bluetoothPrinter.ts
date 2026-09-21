import { BleClient, numbersToDataView } from "@capacitor-community/bluetooth-le";
import { chunkBytes, type PaperWidthKey } from "./escpos";

// Bluetooth LE thermal printing, split into a thin plugin adapter and pure
// logic so the interesting parts (finding the writable characteristic, MTU
// chunking, error messages) are unit-tested against a fake printer.
//
// Limitation worth stating plainly: this speaks BLE only. Cheaper/older
// printers that are Bluetooth *Classic* (SPP) cannot be reached from a web/
// Capacitor app — those keep working through RawBT.

export interface BleCharacteristic {
  uuid: string;
  properties: { write?: boolean; writeWithoutResponse?: boolean };
}
export interface BleService {
  uuid: string;
  characteristics: BleCharacteristic[];
}
export interface ScannedDevice {
  deviceId: string;
  name?: string;
}

export interface BleAdapter {
  initialize(): Promise<void>;
  requestLEScan(onResult: (d: ScannedDevice) => void): Promise<void>;
  stopLEScan(): Promise<void>;
  connect(deviceId: string, onDisconnect: () => void): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  getServices(deviceId: string): Promise<BleService[]>;
  getMtu(deviceId: string): Promise<number>;
  write(deviceId: string, service: string, characteristic: string, data: Uint8Array, withoutResponse: boolean): Promise<void>;
}

export const capacitorBleAdapter: BleAdapter = {
  initialize: () => BleClient.initialize(),
  requestLEScan: (onResult) => BleClient.requestLEScan({ allowDuplicates: false }, (r) => onResult({ deviceId: r.device.deviceId, name: r.device.name })),
  stopLEScan: () => BleClient.stopLEScan(),
  connect: (deviceId, onDisconnect) => BleClient.connect(deviceId, () => onDisconnect()),
  disconnect: (deviceId) => BleClient.disconnect(deviceId),
  getServices: async (deviceId) => {
    const services = await BleClient.getServices(deviceId);
    return services.map((s) => ({ uuid: s.uuid, characteristics: s.characteristics.map((c) => ({ uuid: c.uuid, properties: c.properties })) }));
  },
  getMtu: (deviceId) => BleClient.getMtu(deviceId),
  write: (deviceId, service, characteristic, data, withoutResponse) => {
    const view = numbersToDataView([...data]);
    return withoutResponse ? BleClient.writeWithoutResponse(deviceId, service, characteristic, view) : BleClient.write(deviceId, service, characteristic, view);
  },
};

export interface WriteTarget {
  service: string;
  characteristic: string;
  writeWithoutResponse: boolean;
}

// Thermal printers advertise a vendor-specific service, so there is no fixed
// UUID to filter on: after connecting, take the first characteristic that
// accepts writes (there is reliably only one on these devices).
export async function findWriteTarget(adapter: BleAdapter, deviceId: string): Promise<WriteTarget | null> {
  for (const service of await adapter.getServices(deviceId)) {
    for (const c of service.characteristics) {
      if (c.properties.write || c.properties.writeWithoutResponse) {
        return { service: service.uuid, characteristic: c.uuid, writeWithoutResponse: !!c.properties.writeWithoutResponse };
      }
    }
  }
  return null;
}

export class PartialPrintError extends Error {
  constructor(public sent: number, public total: number, cause: unknown) {
    super(`Cetak terputus di tengah (${sent}/${total} bagian terkirim).`);
    this.name = "PartialPrintError";
    this.cause = cause;
  }
}

// Writes the receipt in MTU-sized chunks with a small gap between them: a whole
// receipt in one write silently truncates on most printers, and cheap ones drop
// bytes when flooded faster than the print head consumes them.
export async function sendToPrinter(
  adapter: BleAdapter,
  deviceId: string,
  target: WriteTarget,
  bytes: Uint8Array,
  opts: { delayMs?: number; sleep?: (ms: number) => Promise<void> } = {}
): Promise<{ chunks: number; chunkSize: number }> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let mtu = 23; // BLE default ATT MTU; payload = mtu - 3 = 20
  try {
    mtu = await adapter.getMtu(deviceId);
  } catch {
    /* not supported here — keep the safe default */
  }
  const chunkSize = Math.max(20, mtu - 3);
  const chunks = chunkBytes(bytes, chunkSize);
  for (let i = 0; i < chunks.length; i++) {
    try {
      await adapter.write(deviceId, target.service, target.characteristic, chunks[i], target.writeWithoutResponse);
    } catch (err) {
      throw new PartialPrintError(i, chunks.length, err);
    }
    await sleep(opts.delayMs ?? 15);
  }
  return { chunks: chunks.length, chunkSize };
}

// Plugin errors carry no stable code across platforms, so match on the text and
// answer with what the cashier can actually do about it.
export function friendlyBleError(err: unknown, fallback: string): string {
  if (err instanceof PartialPrintError) return "Struk mungkin tercetak sebagian — cek kertas, lalu coba cetak ulang.";
  const message = err instanceof Error ? err.message : String(err);
  if (/location/i.test(message)) return "Aktifkan Layanan Lokasi di HP untuk mencari printer Bluetooth.";
  if (/bluetooth.*(disabled|off|not enabled)|not enabled/i.test(message)) return "Bluetooth mati — aktifkan Bluetooth di HP terlebih dahulu.";
  if (/permission|denied|unauthori[sz]ed/i.test(message)) return "Izin Bluetooth belum diberikan. Buka pengaturan aplikasi dan izinkan akses Bluetooth.";
  if (/timeout|timed out/i.test(message)) return "Waktu tunggu habis. Pastikan printer menyala dan berada dekat dengan HP.";
  if (/not available|unavailable|not supported|unsupported/i.test(message)) return "Perangkat ini tidak mendukung Bluetooth LE.";
  return `${fallback} (${message})`;
}

// --- per-device saved printer (a printer belongs to a register, not to the
// shared Sheet, so localStorage — not the Pengaturan tab) -----------------------
export interface SavedPrinter {
  deviceId: string;
  name: string;
  paperWidth: PaperWidthKey;
  autoPrint: boolean;
}
const SAVED_KEY = "kasirRakyat.printer";

export function loadSavedPrinter(): SavedPrinter | null {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as SavedPrinter) : null;
  } catch {
    return null;
  }
}

export function persistSavedPrinter(saved: SavedPrinter | null): void {
  try {
    if (saved) localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    else localStorage.removeItem(SAVED_KEY);
  } catch {
    /* worst case: reconnect next launch */
  }
}
