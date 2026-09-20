import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Directory, Filesystem } from "@capacitor/filesystem";
import type { FotoStorage } from "../types";
import { SheetsAuthExpiredError, SheetsNetworkError } from "./sheets";

// Product photos. Two places a photo can live, chosen in Pengaturan:
//   - "internal": this device's private app memory (Capacitor Filesystem,
//     Directory.Data — not visible in the gallery, wiped if the app is
//     uninstalled, NOT shared with other phones).
//   - "drive": a Google Drive folder owned by the store's own Google account
//     (drive.file scope — the app can only ever see files it created), so
//     the photo shows up on every cashier phone signed in to that store.
//
// The spreadsheet only stores a short reference (Produk.foto):
//   "internal:<filename>"  |  "drive:<fileId>"
// never the image bytes.

const FOLDER = "produk-foto";
const DRIVE_FOLDER_NAME = "Kasir Rakyat - Foto Produk";
const DRIVE_FOLDER_ID_KEY = "kasirRakyat.fotoFolderId";
const MAX_DIMENSION = 640;
const JPEG_QUALITY = 0.8;
const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

export type PhotoSource = "camera" | "gallery";

export interface PhotoRef {
  kind: FotoStorage;
  id: string;
}

export function parseRef(ref: string): PhotoRef | null {
  const i = ref.indexOf(":");
  if (i < 0) return null;
  const kind = ref.slice(0, i);
  const id = ref.slice(i + 1);
  if (!id || (kind !== "internal" && kind !== "drive")) return null;
  return { kind, id };
}

export class PhotoCancelledError extends Error {
  constructor() {
    super("Pengambilan foto dibatalkan.");
    this.name = "PhotoCancelledError";
  }
}

// --- Picking + shrinking ---------------------------------------------------

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gambar tidak bisa dibaca."));
    img.src = src;
  });
}

// Phone photos are 3-12 MB; a POS grid thumbnail needs ~40 KB. Shrinking here
// keeps Sheets/Drive/Filesystem writes tiny and the product grid fast.
async function shrinkToJpegBase64(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tidak bisa memproses gambar.");
  ctx.fillStyle = "#ffffff"; // JPEG has no alpha — flatten PNG transparency onto white
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY).split(",")[1];
}

// Returns a shrunken JPEG as bare base64 (no data: prefix).
export async function pickPhoto(source: PhotoSource): Promise<string> {
  try {
    const photo = await Camera.getPhoto({
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
      resultType: CameraResultType.DataUrl,
      quality: 85,
      width: 1024,
      correctOrientation: true,
      allowEditing: false,
    });
    if (!photo.dataUrl) throw new Error("Foto kosong.");
    return await shrinkToJpegBase64(photo.dataUrl);
  } catch (err) {
    // The plugin rejects with "User cancelled photos app" when the picker is
    // dismissed — that's a normal action, not an error worth surfacing.
    if (err instanceof Error && /cancel/i.test(err.message)) throw new PhotoCancelledError();
    throw err;
  }
}

// --- Internal (private app memory) -----------------------------------------

async function writeInternal(fileName: string, base64: string): Promise<void> {
  await Filesystem.writeFile({ path: `${FOLDER}/${fileName}`, data: base64, directory: Directory.Data, recursive: true });
}

async function readInternal(fileName: string): Promise<string | null> {
  try {
    const res = await Filesystem.readFile({ path: `${FOLDER}/${fileName}`, directory: Directory.Data });
    return typeof res.data === "string" ? res.data : null;
  } catch {
    return null; // missing file (other device / cleared data) → caller shows placeholder
  }
}

async function deleteInternal(fileName: string): Promise<void> {
  try {
    await Filesystem.deleteFile({ path: `${FOLDER}/${fileName}`, directory: Directory.Data });
  } catch {
    /* already gone */
  }
}

// --- Google Drive ------------------------------------------------------------

async function driveFetch(url: string, token: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } });
  } catch (err) {
    throw new SheetsNetworkError(err);
  }
  if (res.status === 401) throw new SheetsAuthExpiredError();
  return res;
}

async function ensureDriveFolder(token: string): Promise<string> {
  const cached = localStorage.getItem(DRIVE_FOLDER_ID_KEY);
  if (cached) {
    const check = await driveFetch(`${DRIVE_FILES}/${cached}?fields=id,trashed`, token);
    if (check.ok) {
      const meta = (await check.json()) as { trashed?: boolean };
      if (!meta.trashed) return cached;
    }
    localStorage.removeItem(DRIVE_FOLDER_ID_KEY);
  }
  const q = encodeURIComponent(`name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const search = await driveFetch(`${DRIVE_FILES}?q=${q}&fields=files(id)&spaces=drive`, token);
  if (search.ok) {
    const body = (await search.json()) as { files?: { id: string }[] };
    if (body.files?.[0]) {
      localStorage.setItem(DRIVE_FOLDER_ID_KEY, body.files[0].id);
      return body.files[0].id;
    }
  }
  const create = await driveFetch(`${DRIVE_FILES}?fields=id`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!create.ok) throw new Error("Gagal membuat folder foto di Google Drive.");
  const { id } = (await create.json()) as { id: string };
  localStorage.setItem(DRIVE_FOLDER_ID_KEY, id);
  return id;
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function uploadToDrive(token: string, fileName: string, base64: string): Promise<string> {
  const folderId = await ensureDriveFolder(token);
  const boundary = `kr${Math.random().toString(36).slice(2)}`;
  const metadata = { name: fileName, mimeType: "image/jpeg", parents: [folderId] };
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: image/jpeg\r\n\r\n`,
    base64ToBytes(base64),
    `\r\n--${boundary}--`,
  ]);
  const res = await driveFetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id`, token, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (res.status === 403 || res.status === 429) {
    throw new Error("Google Drive menolak unggahan (kuota penuh atau terlalu sering). Coba lagi nanti.");
  }
  if (!res.ok) throw new Error("Gagal mengunggah foto ke Google Drive.");
  return ((await res.json()) as { id: string }).id;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Gagal membaca foto."));
    reader.readAsDataURL(blob);
  });
}

// Drive photos are cached in private app memory after the first download, so
// the product grid never waits on the network again (and works offline).
const driveCacheName = (fileId: string) => `drive-${fileId}.jpg`;

async function readDrive(token: string | null, fileId: string): Promise<string | null> {
  const cached = await readInternal(driveCacheName(fileId));
  if (cached) return cached;
  if (!token) return null;
  try {
    const res = await driveFetch(`${DRIVE_FILES}/${fileId}?alt=media`, token);
    if (!res.ok) return null;
    const base64 = await blobToBase64(await res.blob());
    if (base64) await writeInternal(driveCacheName(fileId), base64).catch(() => {});
    return base64 || null;
  } catch {
    return null; // expired token / offline → placeholder, never a crash
  }
}

async function deleteDrive(token: string | null, fileId: string): Promise<void> {
  await deleteInternal(driveCacheName(fileId));
  if (!token) return;
  try {
    await driveFetch(`${DRIVE_FILES}/${fileId}`, token, { method: "DELETE" });
  } catch {
    /* best effort — an orphaned Drive file is harmless */
  }
}

// --- Public API --------------------------------------------------------------

const memoryCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

// Save a freshly picked photo and return the reference to store on the product.
export async function savePhoto(base64: string, produkId: string, storage: FotoStorage, token: string | null): Promise<string> {
  const stamp = Date.now();
  if (storage === "drive") {
    if (!token) throw new SheetsAuthExpiredError();
    const fileId = await uploadToDrive(token, `${produkId}-${stamp}.jpg`, base64);
    await writeInternal(driveCacheName(fileId), base64).catch(() => {});
    const ref = `drive:${fileId}`;
    memoryCache.set(ref, `data:image/jpeg;base64,${base64}`);
    return ref;
  }
  const fileName = `${produkId}-${stamp}.jpg`;
  await writeInternal(fileName, base64);
  const ref = `internal:${fileName}`;
  memoryCache.set(ref, `data:image/jpeg;base64,${base64}`);
  return ref;
}

// Resolve a stored reference to a displayable data: URL (null when the file
// isn't available on this device — e.g. an "internal" photo added on another
// phone). Results are memoised for the session.
export function loadPhotoDataUrl(ref: string, token: string | null): Promise<string | null> {
  const hit = memoryCache.get(ref);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(ref);
  if (pending) return pending;
  const parsed = parseRef(ref);
  if (!parsed) return Promise.resolve(null);
  const job = (async () => {
    const base64 = parsed.kind === "internal" ? await readInternal(parsed.id) : await readDrive(token, parsed.id);
    if (!base64) return null;
    const url = `data:image/jpeg;base64,${base64}`;
    memoryCache.set(ref, url);
    return url;
  })().finally(() => inflight.delete(ref));
  inflight.set(ref, job);
  return job;
}

export async function deletePhoto(ref: string, token: string | null): Promise<void> {
  memoryCache.delete(ref);
  const parsed = parseRef(ref);
  if (!parsed) return;
  if (parsed.kind === "internal") await deleteInternal(parsed.id);
  else await deleteDrive(token, parsed.id);
}
