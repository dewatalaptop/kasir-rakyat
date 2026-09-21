import { decodeEscPos } from "../../lib/escpos";

// A virtual BLE thermal printer standing in for @capacitor-community/bluetooth-le.
export const printer = {
  connected: false,
  writes: [] as number[][],
  mtu: 185,
  powered: true, // false => "Bluetooth is not enabled"
  failAfterWrites: -1, // >= 0 => the Nth write throws (mid-print failure)
  reset() {
    printer.connected = false;
    printer.writes = [];
    printer.mtu = 185;
    printer.powered = true;
    printer.failAfterWrites = -1;
  },
  printed() {
    return decodeEscPos(Uint8Array.from(printer.writes.flat()));
  },
  jobs() {
    // one print job = init ... cut; split the byte stream on the cut command
    const bytes = Uint8Array.from(printer.writes.flat());
    const jobs: Uint8Array[] = [];
    let start = 0;
    for (let i = 0; i < bytes.length - 3; i++) {
      if (bytes[i] === 0x1d && bytes[i + 1] === 0x56 && bytes[i + 2] === 66) {
        jobs.push(bytes.slice(start, i + 4));
        start = i + 4;
      }
    }
    return jobs.map((j) => decodeEscPos(j));
  },
};

export function numbersToDataView(nums: number[]): DataView {
  return new DataView(Uint8Array.from(nums).buffer);
}

export const BleClient = {
  async initialize() {
    if (!printer.powered) throw new Error("Bluetooth is not enabled");
  },
  async requestLEScan(_o: unknown, cb: (r: { device: { deviceId: string; name?: string } }) => void) {
    cb({ device: { deviceId: "AA:01", name: "MPT-II" } });
    cb({ device: { deviceId: "AA:02", name: undefined } }); // unnamed => ignored
    cb({ device: { deviceId: "AA:03", name: "Printer_58" } });
  },
  async stopLEScan() {},
  async connect() {
    printer.connected = true;
  },
  async disconnect() {
    printer.connected = false;
  },
  async getServices() {
    return [
      { uuid: "180a", characteristics: [{ uuid: "2a29", properties: {} }] },
      { uuid: "ff00", characteristics: [{ uuid: "ff02", properties: { writeWithoutResponse: true } }] },
    ];
  },
  async getMtu() {
    return printer.mtu;
  },
  async write(_d: string, _s: string, _c: string, v: DataView) {
    printer.writes.push([...new Uint8Array(v.buffer)]);
  },
  async writeWithoutResponse(_d: string, _s: string, _c: string, v: DataView) {
    if (printer.failAfterWrites >= 0 && printer.writes.length >= printer.failAfterWrites) throw new Error("GATT write failed");
    printer.writes.push([...new Uint8Array(v.buffer)]);
  },
};
