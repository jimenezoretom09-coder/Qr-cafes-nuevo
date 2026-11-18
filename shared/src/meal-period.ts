/**
 * Desayuno corre hasta las 12:30pm y almuerzo arranca a las 11:00am — se
 * traslapan 90 minutos a proposito (el restaurante sirve ambos en ese rango).
 * Fuera del traslape solo uno de los dos tiene sentido como opcion por defecto,
 * pero el mesero/comensal siempre puede elegir el otro manualmente.
 */
const BREAKFAST_ENDS_MINUTES = 12 * 60 + 30;
const LUNCH_STARTS_MINUTES = 11 * 60;

export function getDefaultMealPeriod(now: Date = new Date()): "BREAKFAST" | "LUNCH" {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const breakfastOpen = minutes < BREAKFAST_ENDS_MINUTES;
  const lunchOpen = minutes >= LUNCH_STARTS_MINUTES;
  if (breakfastOpen && !lunchOpen) return "BREAKFAST";
  if (lunchOpen && !breakfastOpen) return "LUNCH";
  // Traslape (11:00-12:30) o caso raro fuera de ambos rangos: almuerzo por defecto.
  return "LUNCH";
}

type ConPeriodo = { mealPeriod: string; items?: unknown[] };

function tieneContenido(categorias: ConPeriodo[], periodo: "BREAKFAST" | "LUNCH") {
  return categorias.some(
    (c) => (c.mealPeriod === periodo || c.mealPeriod === "ALL") && (c.items === undefined || c.items.length > 0)
  );
}

/**
 * Elige con que pestaña abrir la carta. Arranca por la hora del dia, pero si esa pestaña no
 * tiene ningun plato salta a la otra: un restaurante que solo cargo categorias de almuerzo no
 * puede amanecer mostrandole al comensal una carta vacia a las 9am.
 */
export function pickMealPeriod(categorias: ConPeriodo[], now: Date = new Date()): "BREAKFAST" | "LUNCH" {
  const porHora = getDefaultMealPeriod(now);
  if (tieneContenido(categorias, porHora)) return porHora;
  const otro = porHora === "BREAKFAST" ? "LUNCH" : "BREAKFAST";
  return tieneContenido(categorias, otro) ? otro : porHora;
}

/**
 * Si todas las categorias son "Todo el dia", la barra Desayuno/Almuerzo no cambia nada y solo
 * confunde — en ese caso no se muestra.
 */
export function hasMealSplit(categorias: ConPeriodo[]): boolean {
  return categorias.some((c) => c.mealPeriod !== "ALL");
}
