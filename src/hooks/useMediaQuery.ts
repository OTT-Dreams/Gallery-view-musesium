import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export function useIsTouchDevice(): boolean {
  const coarse = useMediaQuery("(pointer: coarse)");
  const [touchCapable] = useState(
    () => typeof navigator !== "undefined" && navigator.maxTouchPoints > 0
  );
  return coarse || touchCapable;
}
