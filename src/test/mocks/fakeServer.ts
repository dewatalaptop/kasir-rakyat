// Stand-in for the Cloud Functions in ai-app-builder (same request/response
// contract as getStudioOffer / requestStudioUpgrade / cancelMyStudioUpgrade /
// checkStudioLicense). `approve()` plays the part of the owner tapping
// "Setujui" in the dashboard's Pembayaran tab.
export interface Bank {
  bankName: string;
  accountNumber: string;
  accountName: string;
  // present on servers that support several accounts; the fields above mirror accounts[0]
  accounts?: { bankName: string; accountNumber: string; accountName: string }[];
  whatsapp: string;
  note: string;
}

export interface FakeServer {
  product: { id: string; brandName: string; priceIdr: number; billingCycle: "bulanan"; purchasable: boolean };
  bank: Bank | null;
  license: { active: boolean; expiresAt: string | null };
  pending: null | { id: string; baseAmount: number; uniqueCode: number; totalAmount: number; createdAt: string };
  calls: string[];
  offline: boolean;
  approve(): void;
  callable(name: string): (data?: unknown) => Promise<{ data: unknown }>;
}

export function createFakeServer(opts: { paid?: boolean } = {}): FakeServer {
  const srv: FakeServer = {
    product: { id: "aHqfxM275OooEWmg6J3W", brandName: "kasir rakyat", priceIdr: 50000, billingCycle: "bulanan", purchasable: true },
    bank: { bankName: "BNI", accountNumber: "1234567890", accountName: "CV Nuvora", whatsapp: "6281234567890", note: "Transfer TEPAT sesuai nominal" },
    license: opts.paid ? { active: true, expiresAt: new Date(Date.now() + 20 * 86400000).toISOString() } : { active: false, expiresAt: null },
    pending: null,
    calls: [],
    offline: false,
    approve() {
      if (!srv.pending) return;
      const base = srv.license.active && srv.license.expiresAt ? new Date(srv.license.expiresAt).getTime() : Date.now();
      srv.license = { active: true, expiresAt: new Date(base + 30 * 86400000).toISOString() };
      srv.pending = null;
    },
    callable(name) {
      return async () => {
        srv.calls.push(name);
        if (srv.offline) throw new Error("Failed to fetch");
        switch (name) {
          case "checkStudioLicense":
            return { data: srv.license };
          case "getStudioOffer":
            return { data: { product: srv.product, bank: srv.bank, license: srv.license, pending: srv.pending } };
          case "requestStudioUpgrade": {
            if (!srv.bank) throw new Error("Rekening pembayaran belum diatur oleh penyedia aplikasi.");
            if (!srv.pending) {
              const code = 1 + Math.floor(Math.random() * 999);
              srv.pending = { id: `req-${Date.now()}`, baseAmount: 50000, uniqueCode: code, totalAmount: 50000 + code, createdAt: new Date().toISOString() };
            }
            return { data: { ...srv.pending, reused: false } };
          }
          case "cancelMyStudioUpgrade":
            srv.pending = null;
            return { data: { ok: true } };
          default:
            throw new Error(`unknown callable ${name}`);
        }
      };
    },
  };
  return srv;
}
