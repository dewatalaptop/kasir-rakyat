import { useEffect, useState } from "react";
import { loadPhotoDataUrl } from "../lib/productPhotos";

// Resolves a stored photo reference to a displayable URL. Returns null while
// loading, when there is no photo, or when the file isn't available on this
// device — callers always render a placeholder for null.
export function useProductPhotoUrl(ref: string, token: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!ref) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    loadPhotoDataUrl(ref, token).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [ref, token]);
  return url;
}
