// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../firebase", () => ({ firebaseAuth: {}, googleProvider: {}, functions: {} }));
import { SheetsNotFoundError, SheetsQuotaExceededError, SheetsRateLimitError, SheetsScopeError, classifyForbidden, googleReason, onSheetsProblem, readRows } from "./sheets";
import { restorePendingFor, stashPendingFor } from "./session";

const SHEET_URL = "https://sheets.googleapis.com/v4/spreadsheets/abc123/values/Produk!A2:C";
const DRIVE_LIST = "https://www.googleapis.com/drive/v3/files?q=x";

const body = (status: string, message: string, extra = "") => JSON.stringify({ error: { code: 403, message, status, errors: extra ? [{ reason: extra }] : [] } });

describe("what a Google 403 means", () => {
  it("another account's spreadsheet (drive.file): treated like a missing file, not a raw error", () => {
    expect(classifyForbidden(body("PERMISSION_DENIED", "The caller does not have permission"), SHEET_URL)).toBe("other-account-file");
    expect(classifyForbidden(body("PERMISSION_DENIED", "The caller does not have permission"), DRIVE_LIST)).toBe("other"); // a list/create call is not "that file"
  });
  it("tells scope, rate limit, quota and disabled API apart", () => {
    expect(classifyForbidden(body("PERMISSION_DENIED", "Request had insufficient authentication scopes.", "ACCESS_TOKEN_SCOPE_INSUFFICIENT"), SHEET_URL)).toBe("scope");
    expect(classifyForbidden(body("PERMISSION_DENIED", "Rate Limit Exceeded", "userRateLimitExceeded"), DRIVE_LIST)).toBe("rate");
    expect(classifyForbidden(body("PERMISSION_DENIED", "quota", "storageQuotaExceeded"), DRIVE_LIST)).toBe("quota");
    expect(classifyForbidden(body("PERMISSION_DENIED", "Google Drive API has not been used in project 123 before or it is disabled.", "accessNotConfigured"), DRIVE_LIST)).toBe("api-disabled");
  });
  it("googleReason gives one short line, never the whole blob", () => {
    expect(googleReason(body("PERMISSION_DENIED", "The caller does not have permission"))).toBe("PERMISSION_DENIED — The caller does not have permission");
    expect(googleReason("<html>" + "x".repeat(500))).toHaveLength(160);
  });
});

describe("sheetsFetch on a 403", () => {
  const respond = (status: number, text: string) => vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(text, { status }));
  afterEach(() => vi.restoreAllMocks());

  it("permission denied on the cached spreadsheet => SheetsNotFoundError + a 'sheet-missing' signal (so the app offers to find/create this account's own)", async () => {
    respond(403, body("PERMISSION_DENIED", "The caller does not have permission"));
    const seen: string[] = [];
    const off = onSheetsProblem((p) => seen.push(p));
    await expect(readRows("tok", "abc123", "Produk!A2:C")).rejects.toBeInstanceOf(SheetsNotFoundError);
    off();
    expect(seen).toEqual(["sheet-missing"]);
  });

  it("missing Drive permission => SheetsScopeError with a plain instruction", async () => {
    respond(403, body("PERMISSION_DENIED", "Request had insufficient authentication scopes.", "ACCESS_TOKEN_SCOPE_INSUFFICIENT"));
    const err = await readRows("tok", "abc123", "Produk!A2:C").catch((e) => e);
    expect(err).toBeInstanceOf(SheetsScopeError);
    expect(err.message).toMatch(/Sambungkan Ulang/);
  });

  it("rate limit and full Drive keep their friendly errors", async () => {
    respond(403, body("PERMISSION_DENIED", "Rate Limit Exceeded", "userRateLimitExceeded"));
    await expect(readRows("tok", "abc123", "Produk!A2:C")).rejects.toBeInstanceOf(SheetsRateLimitError);
    respond(403, body("PERMISSION_DENIED", "The user's Drive storage quota has been exceeded.", "storageQuotaExceeded"));
    await expect(readRows("tok", "abc123", "Produk!A2:C")).rejects.toBeInstanceOf(SheetsQuotaExceededError);
  });

  it("an unknown 403 is readable: says what to do and the short Google reason, no raw JSON", async () => {
    respond(403, body("FAILED_PRECONDITION", "Something new", "weird"));
    const err = await readRows("tok", "abc123", "Produk!A2:C").catch((e) => e);
    expect(err.message).toMatch(/Sambungkan Ulang/);
    expect(err.message).toContain("Something new");
    expect(err.message).not.toContain("{");
  });
});

describe("queued offline sales never cross to another account", () => {
  const KEY = "kasirRakyat.pendingTransaksi";
  it("are set aside when an account leaves and come back for that account only", () => {
    localStorage.clear();
    localStorage.setItem(KEY, JSON.stringify([{ id: "t1" }, { id: "t2" }]));
    stashPendingFor("owner-A");
    expect(localStorage.getItem(KEY)).toBeNull(); // the next account starts with an empty queue
    restorePendingFor("owner-B");
    expect(localStorage.getItem(KEY)).toBeNull(); // B gets nothing of A's
    restorePendingFor("owner-A");
    expect(JSON.parse(localStorage.getItem(KEY)!).map((t: { id: string }) => t.id)).toEqual(["t1", "t2"]);
    expect(localStorage.getItem(`${KEY}.owner-A`)).toBeNull();
  });
  it("does not duplicate a sale that is already queued", () => {
    localStorage.clear();
    localStorage.setItem(KEY, JSON.stringify([{ id: "t1" }]));
    stashPendingFor("A");
    localStorage.setItem(KEY, JSON.stringify([{ id: "t1" }, { id: "t3" }]));
    restorePendingFor("A");
    expect(JSON.parse(localStorage.getItem(KEY)!).map((t: { id: string }) => t.id)).toEqual(["t1", "t3"]);
  });
});
