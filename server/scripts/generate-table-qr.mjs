import { PrismaClient } from "@prisma/client";
import QRCode from "qrcode";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Pass the public base URL as an argument once the app is live on Netlify/Render, e.g.:
//   node scripts/generate-table-qr.mjs https://tu-restaurante.netlify.app
// Defaults to the LAN address so this works today, before the online deploy is finished.
const baseUrl = process.argv[2] ?? "http://192.168.0.15:4000";

const prisma = new PrismaClient();
const outDir = new URL("./qr-mesas/", import.meta.url);
mkdirSync(outDir, { recursive: true });

async function main() {
  const tables = await prisma.restaurantTable.findMany({ where: { archived: false } });
  // Orden natural (M1, M2 ... M14) en vez de alfabetico (M1, M10, M11 ... M2) para que las
  // hojas impresas salgan en el mismo orden fisico en que se van a pegar en las mesas.
  tables.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  const rows = [];
  for (const table of tables) {
    const url = `${baseUrl}/m/${table.publicToken}`;
    const fileName = `mesa-${table.label}.png`;
    await QRCode.toFile(fileURLToPath(new URL(fileName, outDir)), url, { width: 500, margin: 2 });
    rows.push({ label: table.label, url, fileName });
    console.log(`Mesa ${table.label}: ${url}`);
  }

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>QR para imprimir - Mesas</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f1f5f9; margin: 0; padding: 24px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
  .card { background: #fff; border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,.08); page-break-inside: avoid; }
  .card h2 { margin: 0 0 12px; color: #1e293b; }
  .card img { width: 100%; max-width: 240px; }
  .card p { font-size: 11px; color: #64748b; word-break: break-all; }
</style>
</head>
<body>
  <div class="grid">
    ${rows
      .map(
        (r) => `<div class="card">
      <h2>Mesa ${r.label}</h2>
      <img src="qr-mesas/${r.fileName}" alt="QR mesa ${r.label}" />
      <p>${r.url}</p>
    </div>`
      )
      .join("\n")}
  </div>
</body>
</html>`;

  writeFileSync(new URL("./qr-mesas.html", import.meta.url), html);
  console.log("\nAbre server/scripts/qr-mesas.html en el navegador e imprime esa pagina.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
