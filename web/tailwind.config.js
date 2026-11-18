/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        role: {
          waiter: "#2563eb",
          kitchen: "#dc2626",
          admin: "#0f172a",
          cashier: "#16a34a",
        },
        // Paleta "Epicurean" del autopedido del comensal (vitrina premium) — con nombre propio
        // para no chocar con los colores slate/blue que usan Admin/Cocina/Caja.
        epi: {
          bg: "#fbf9f8",
          surface: "#ffffff",
          "surface-low": "#f5f3f3",
          "surface-container": "#efeded",
          // ink y gold salen de la marca de cada cafe (Admin > Asistente y marca), aplicada en
          // tiempo de ejecucion como variables CSS. Ver applyBrand() en self-order/brand.ts.
          ink: "rgb(var(--epi-ink) / <alpha-value>)",
          "ink-variant": "#444748",
          outline: "#747878",
          "outline-variant": "#c4c7c7",
          gold: "rgb(var(--epi-gold) / <alpha-value>)",
          "gold-container": "#fed488",
          "on-gold-container": "#785a1a",
          error: "#ba1a1a",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        body: ['"Manrope"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
