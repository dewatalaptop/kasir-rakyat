// Real photos (verified live Unsplash URLs, canonical photo ids — not
// generic stock placeholders), used as the header's rotating promo
// background per business type / default rotation. Swap or extend with
// the owner's own event/promo photos from the admin Pengaturan screen
// (not built in v1 — see plan's "out of scope").
export interface PromoBackground {
  id: string;
  url: string;
  alt: string;
}

function unsplash(id: string): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;
}

export const DEFAULT_PROMO_BACKGROUNDS: PromoBackground[] = [
  { id: "restaurant-interior", url: unsplash("photo-1667388969250-1c7220bf3f37"), alt: "Interior restoran hangat" },
  { id: "traditional-market", url: unsplash("photo-1527965408463-82ae0731825c"), alt: "Pasar tradisional Indonesia" },
  { id: "warung-kopi", url: unsplash("photo-1723016611306-a17cf35a36be"), alt: "Warung kopi" },
  { id: "grocery-shelves", url: unsplash("photo-1670684684445-a4504dca0bbc"), alt: "Rak toko kelontong" },
];
