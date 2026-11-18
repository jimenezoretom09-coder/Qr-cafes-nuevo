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
          ink: "#1b1c1c",
          "ink-variant": "#444748",
          outline: "#747878",
          "outline-variant": "#c4c7c7",
          gold: "#775a19",
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
