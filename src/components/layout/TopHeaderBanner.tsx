import { DEFAULT_PROMO_BACKGROUNDS } from "../../assets/promoBackgrounds";

// Header that doubles as a promo banner carousel — pure CSS scroll-snap,
// no JS carousel library (dependency-light per this ecosystem's own
// standing UI preference).
export function TopHeaderBanner({ businessName, tagline }: { businessName: string; tagline?: string }) {
  return (
    <div className="relative">
      <div className="scrollbar-hide flex h-44 snap-x snap-mandatory overflow-x-auto sm:h-56">
        {DEFAULT_PROMO_BACKGROUNDS.map((bg) => (
          <div key={bg.id} className="relative h-full w-full flex-none snap-center">
            <img src={bg.url} alt={bg.alt} className="h-full w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-4">
        <h1 className="font-display text-xl font-extrabold text-white drop-shadow-sm sm:text-2xl">{businessName}</h1>
        {tagline && <p className="text-sm text-white/90 drop-shadow-sm">{tagline}</p>}
      </div>
    </div>
  );
}
