/** "#3b2a20" -> "59 42 32", el formato que esperan las variables de color de Tailwind. */
export function hexToRgbTriplet(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Pinta la carta con los colores del cafe y pone su nombre en la pestaña del navegador. */
export function applyBrand(business: { name: string; primaryColor: string; accentColor: string }) {
  const root = document.documentElement;
  const ink = hexToRgbTriplet(business.primaryColor);
  const gold = hexToRgbTriplet(business.accentColor);
  if (ink) root.style.setProperty("--epi-ink", ink);
  if (gold) root.style.setProperty("--epi-gold", gold);
  document.title = business.name;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", business.primaryColor);
}

/** Id anonimo de este celular: el mismo para pedir y para el chat, asi el chat sabe que es suyo. */
export function getDinerId(): string {
  const key = "self-order-assistant-visitor-id";
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

const NAME_KEY = "rms-diner-name";

export function getSavedDinerName(): string | null {
  try {
    return localStorage.getItem(NAME_KEY);
  } catch {
    return null;
  }
}

export function saveDinerName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* modo privado: el nombre dura solo esta visita */
  }
}
