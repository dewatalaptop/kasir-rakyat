import { hashPassword } from "../../lib/adminAuth";

export type Biz = "resto" | "warung" | "toko" | "lainnya";

interface CatalogItem {
  name: string;
  price: number;
  cat: number;
  stock?: string;
}

// Realistic starter catalogs per kind of business (prices chosen to exercise
// rounding: Rp3.333 at 11% tax, a 34-char product name, low-stock badges).
export const CATALOG: Record<Biz, CatalogItem[]> = {
  resto: [
    { name: "Nasi Goreng", price: 15000, cat: 0 },
    { name: "Ayam Bakar", price: 18000, cat: 0 },
    { name: "Mie Goreng Seafood Spesial Komplit", price: 22000, cat: 0 },
    { name: "Es Teh Manis", price: 5000, cat: 1 },
    { name: "Jus Alpukat", price: 14000, cat: 1, stock: "3" },
    { name: "Paket Keluarga", price: 85000, cat: 2 },
  ],
  warung: [
    { name: "Kopi Hitam", price: 4000, cat: 1 },
    { name: "Indomie Telur", price: 9000, cat: 0 },
    { name: "Gorengan", price: 1000, cat: 2 },
    { name: "Es Teh", price: 3000, cat: 1 },
    { name: "Rokok Filter", price: 27000, cat: 2, stock: "2" },
  ],
  toko: [
    { name: "Beras 5kg", price: 68500, cat: 0 },
    { name: "Minyak Goreng 2L", price: 34500, cat: 0 },
    { name: "Gula 1kg", price: 17500, cat: 0 },
    { name: "Telur 1kg", price: 29000, cat: 0 },
    { name: "Sabun Mandi", price: 3333, cat: 1 },
    { name: "Deterjen 800g", price: 21900, cat: 1 },
  ],
  lainnya: [
    { name: "Cuci Motor", price: 15000, cat: 0 },
    { name: "Cuci Mobil", price: 40000, cat: 0 },
    { name: "Poles Body", price: 150000, cat: 0 },
  ],
};
const CATS: Record<Biz, string[]> = {
  resto: ["Makanan Utama", "Minuman", "Paket Hemat"],
  warung: ["Makanan", "Minuman", "Rokok & Lainnya"],
  toko: ["Sembako", "Kebutuhan Rumah"],
  lainnya: ["Jasa"],
};
// [tax %, service %]
export const RATES: Record<Biz, [number, number]> = { resto: [10, 5], warung: [0, 0], toko: [11, 0], lainnya: [0, 0] };
export const NAMES: Record<Biz, string> = { resto: "Resto Sedap Rasa", warung: "Warung Bu Ani", toko: "Toko Maju Jaya", lainnya: "Cuci Kilat" };
export const OWNER_PASSWORD = "owner123";

export interface FakeSheets {
  tables: Record<string, string[][]>;
  // simulate no connectivity (fetch rejects) / a failing append to one tab
  offline: boolean;
  failAppendTo: string | null;
  // spreadsheet ids Google refuses for this account (a file another account made): 403 PERMISSION_DENIED
  forbiddenIds: Set<string>;
  // set to make the next Sheets call fail with this raw 403 body instead
  forbidBody: string | null;
  // this bearer token is answered 401 by every Google API (an expired access token)
  staleToken: string | null;
  appended: string[]; // "Tab" per successful append, in order
  install(): void;
  uninstall(): void;
}

// In-memory stand-in for the parts of the Google Sheets/Drive REST API the app
// uses. NOTE: there is deliberately NO "Kasir" tab at first — this is a shop that
// existed before the multi-cashier feature, so the app must create it lazily.
export async function createFakeSheets(biz: Biz): Promise<FakeSheets> {
  const iso = new Date().toISOString();
  const [tax, service] = RATES[biz];
  const tables: Record<string, string[][]> = {
    Pengaturan: [
      ["business_name", NAMES[biz], iso],
      ["business_type", biz, iso],
      ["address", "Jl. Merdeka No. 17, Salatiga", iso],
      ["phone", "0812-3456-7890", iso],
      ["meja_enabled", biz === "resto" ? "TRUE" : "FALSE", iso],
      ["tax_percent", String(tax), iso],
      ["service_charge_percent", String(service), iso],
      ["receipt_footer_text", "Terima kasih, sampai jumpa lagi!", iso],
      ["printer_pref", "rawbt", iso],
      ["onboarding_completed", "TRUE", iso],
      ["admin_password_hash", await hashPassword(OWNER_PASSWORD), iso],
    ],
    Produk: CATALOG[biz].map((p, i) => [`p${i}`, p.name, `k${p.cat}`, String(p.price), "", "aktif", p.stock ?? "", String(i), "package", iso, iso, ""]),
    Kategori: CATS[biz].map((n, i) => [`k${i}`, n, String(i), "brand", iso]),
    Transaksi: [],
  };

  const real = globalThis.fetch;
  const state: FakeSheets = {
    tables,
    offline: false,
    failAppendTo: null,
    forbiddenIds: new Set<string>(),
    forbidBody: null,
    staleToken: null,
    appended: [],
    install() {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
        const method = (init?.method ?? "GET").toUpperCase();
        if (/googleapis\.com/.test(url) && state.offline) throw new TypeError("Failed to fetch");

        const bearer = (init?.headers as Record<string, string> | undefined)?.Authorization;
        if (state.staleToken && /googleapis.com/.test(url) && bearer === `Bearer ${state.staleToken}`) {
          return json({ error: { code: 401, message: "Invalid Credentials", status: "UNAUTHENTICATED" } }, 401);
        }
        const sid = url.match(/sheets\.googleapis\.com\/v4\/spreadsheets\/([^/:?]+)/)?.[1];
        if (state.forbidBody && /googleapis\.com/.test(url)) return new Response(state.forbidBody, { status: 403, headers: { "Content-Type": "application/json" } });
        if (sid && state.forbiddenIds.has(sid)) return json({ error: { code: 403, message: "The caller does not have permission", status: "PERMISSION_DENIED" } }, 403);
        if (/sheets\.googleapis\.com\/v4\/spreadsheets\/[^/]+:batchUpdate/.test(url)) {
          for (const r of JSON.parse(String(init?.body)).requests ?? []) if (r.addSheet) tables[r.addSheet.properties.title] ??= [];
          return json({});
        }
        if (/sheets\.googleapis\.com\/v4\/spreadsheets\/[^/?]+\?fields=/.test(url)) {
          return json({ sheets: Object.keys(tables).map((title) => ({ properties: { title } })) });
        }
        const m = url.match(/sheets\.googleapis\.com\/v4\/spreadsheets\/[^/]+\/values\/([^?:]+)(:append|:clear)?/);
        if (m) {
          const range = decodeURIComponent(m[1]);
          const tab = range.split("!")[0];
          if (!tables[tab]) return json({ error: { code: 400, message: `Unable to parse range: ${range}` } }, 400);
          const rows = tables[tab];
          if (m[2] === ":append") {
            if (state.failAppendTo === tab) return json({ error: { code: 500, message: "boom" } }, 500);
            rows.push(JSON.parse(String(init?.body)).values[0].map(String));
            state.appended.push(tab);
            return json({});
          }
          if (m[2] === ":clear") return json({});
          if (method === "PUT") {
            const row = JSON.parse(String(init?.body)).values[0].map(String);
            const rn = Number(range.match(/!A(\d+):/)?.[1] ?? 0);
            if (rn >= 2) rows[rn - 2] = row;
            return json({});
          }
          return json({ values: rows });
        }
        if (/googleapis\.com\/drive/.test(url)) return method === "POST" ? json({ id: "mock-sheet-2" }) : json({ files: [] });
        return real(input, init);
      }) as typeof fetch;
    },
    uninstall() {
      globalThis.fetch = real;
    },
  };
  return state;
}
