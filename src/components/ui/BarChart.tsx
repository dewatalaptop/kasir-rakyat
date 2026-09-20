export interface BarDatum {
  label: string;
  value: number;
  // Full text for the hover/screen-reader title, e.g. "Sen, 22 Sep: Rp 1.200.000".
  title?: string;
}

// "1,5jt" / "250rb" / "900" — axis labels must stay short.
export function compactRupiah(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1).replace(".", ",")}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(Math.round(n));
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

// Dependency-free SVG bar chart. Scales to its container width (viewBox +
// preserveAspectRatio none would distort text, so text is kept in a fixed
// viewBox and the whole SVG scales uniformly).
export function BarChart({
  data,
  height = 220,
  width = 640,
  valueFormatter = compactRupiah,
}: {
  data: BarDatum[];
  height?: number;
  // viewBox width — pick roughly the on-screen width so axis text keeps its size.
  width?: number;
  valueFormatter?: (n: number) => string;
}) {
  const W = width;
  const H = height;
  const padL = 44;
  const padR = 8;
  const padT = 12;
  const padB = 26;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const slot = data.length > 0 ? plotW / data.length : plotW;
  const barW = Math.min(34, slot * 0.62);
  // Show at most ~10 x labels so a 30-bar chart stays readable.
  const labelEvery = Math.max(1, Math.ceil(data.length / 10));
  const allZero = data.every((d) => d.value === 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Grafik penjualan">
      {ticks.map((t) => {
        const y = padT + plotH - (t / max) * plotH;
        return (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={padL - 6} y={y + 3.5} textAnchor="end" fontSize="10" fill="var(--text-faint)">
              {valueFormatter(t)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = (d.value / max) * plotH;
        const x = padL + i * slot + (slot - barW) / 2;
        const y = padT + plotH - h;
        const last = i === data.length - 1;
        return (
          <g key={`${d.label}-${i}`}>
            <title>{d.title ?? `${d.label}: ${d.value}`}</title>
            {d.value > 0 && <rect x={x} y={y} width={barW} height={h} rx={4} fill={last ? "var(--brand-500)" : "var(--brand-300)"} />}
            {d.value === 0 && <rect x={x} y={padT + plotH - 2} width={barW} height={2} rx={1} fill="var(--border)" />}
            {i % labelEvery === 0 && (
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--text-faint)">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
      {allZero && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="13" fill="var(--text-faint)">
          Belum ada penjualan pada periode ini
        </text>
      )}
    </svg>
  );
}
