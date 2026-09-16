import { useNavigate } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { useSheetsData } from "../../hooks/useSheetsData";
import { getKategori, getProduk } from "../../lib/sheetsStore";
import { formatRupiah } from "../../lib/format";
import { limitsFor } from "../../lib/limits";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { EditIcon, GridIcon, PlusIcon } from "../../components/ui/icons";
import { Spinner } from "../../components/ui/Spinner";
import { useToast } from "../../components/ui/Toast";

export function ProductsPage() {
  const { accessToken, spreadsheetId, plan } = useSettings();
  const { show } = useToast();
  const navigate = useNavigate();
  const produkResult = useSheetsData(accessToken && spreadsheetId ? () => getProduk(accessToken, spreadsheetId) : null, [accessToken, spreadsheetId]);
  const kategoriResult = useSheetsData(accessToken && spreadsheetId ? () => getKategori(accessToken, spreadsheetId) : null, [accessToken, spreadsheetId]);
  const kategoriMap = new Map((kategoriResult.data ?? []).map((k) => [k.id, k.nama]));

  const activeCount = (produkResult.data ?? []).filter((p) => p.status === "aktif").length;
  const maxProduk = limitsFor(plan).maxProduk;
  const atLimit = activeCount >= maxProduk;

  function handleAddClick() {
    if (atLimit) {
      show(`Batas ${maxProduk} produk aktif untuk versi gratis. Hubungi kami untuk upgrade ke versi berbayar.`, "error");
      return;
    }
    navigate("/admin/produk/baru");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold text-[var(--text)]">Produk</h1>
        <Button onClick={handleAddClick} shape="pill" icon={<PlusIcon size={16} />} className={atLimit ? "opacity-60" : ""}>
          Tambah
        </Button>
      </div>
      {Number.isFinite(maxProduk) && (
        <p className="text-xs text-[var(--text-faint)]">
          {activeCount}/{maxProduk} produk aktif (versi gratis){atLimit && " — batas tercapai"}
        </p>
      )}
      {produkResult.loading ? (
        <div className="flex justify-center py-8 text-[var(--brand-500)]">
          <Spinner />
        </div>
      ) : (produkResult.data ?? []).length === 0 ? (
        <EmptyState icon={<GridIcon size={32} />} title="Belum ada produk" />
      ) : (
        <div className="flex flex-col gap-2">
          {(produkResult.data ?? []).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/admin/produk/${p.id}/edit`)}
              className="shape-card flex items-center justify-between border border-[var(--border)] bg-[var(--surface)] p-3 text-left"
            >
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                  {p.nama}
                  {p.status === "nonaktif" && (
                    <span className="rounded-full bg-[var(--border-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-faint)]">Nonaktif</span>
                  )}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{kategoriMap.get(p.kategoriId) ?? "-"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-tabular text-sm font-bold text-[var(--brand-600)]">{formatRupiah(p.harga)}</span>
                <EditIcon size={16} className="text-[var(--text-faint)]" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
