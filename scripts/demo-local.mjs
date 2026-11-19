/**
 * Demo local de RMS Cafés: todo corre en este computador, sin subir nada a internet.
 *
 *   - Arranca una base de datos propia (embedded-postgres, no hay que instalar PostgreSQL).
 *   - La primera vez carga la carta de El Sombrerero (o la que diga DEMO_SEED: sombrerero | demo).
 *   - Arranca el sistema en el puerto 4000 y abre el navegador.
 *   - Muestra la direccion para entrar desde el celular (mismo Wi-Fi) y un QR de la Mesa 1.
 *
 * Uso: doble clic en iniciar-demo.bat (Windows) o ./iniciar-demo.sh (Mac/Linux).
 * Para empezar de cero: borrar la carpeta .demo-local.
 */
import EmbeddedPostgres from "embedded-postgres";
import QRCode from "qrcode";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, ".demo-local");
const PG_DIR = path.join(DATA, "db");
const PG_PORT = 5434;
const APP_PORT = 4000;
const SEED = process.env.DEMO_SEED ?? "sombrerero";
const isWindows = process.platform === "win32";

function step(msg) {
  console.log(`\n▶ ${msg}`);
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", shell: isWindows, ...opts });
  if (res.status !== 0) {
    console.error(`\n✖ Falló: ${cmd} ${args.join(" ")}`);
    process.exit(1);
  }
}

/** La IP de este computador en el Wi-Fi (para abrir el sistema desde el celular). */
function lanAddress() {
  const candidates = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family !== "IPv4" || a.internal) continue;
      // Se ignoran adaptadores virtuales (VirtualBox, WSL, Docker, VPN).
      if (/vbox|virtual|vmware|wsl|docker|vethernet|tailscale|zerotier/i.test(name)) continue;
      candidates.push(a.address);
    }
  }
  return (
    candidates.find((ip) => ip.startsWith("192.168.")) ??
    candidates.find((ip) => ip.startsWith("10.")) ??
    candidates.find((ip) => /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) ??
    candidates[0] ??
    "localhost"
  );
}

function openBrowser(url) {
  const [cmd, args] = isWindows
    ? ["cmd", ["/c", "start", "", url]]
    : process.platform === "darwin"
    ? ["open", [url]]
    : ["xdg-open", [url]];
  try {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    child.on("error", () => undefined); // sin navegador: igual queda la direccion en pantalla
    child.unref();
  } catch {
    /* idem */
  }
}

async function waitForHealth(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* todavia arrancando */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  mkdirSync(DATA, { recursive: true });

  // Clave propia de esta demo (para los inicios de sesion del personal).
  const secretFile = path.join(DATA, "jwt-secret");
  if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(32).toString("hex"));
  const jwtSecret = readFileSync(secretFile, "utf8").trim();

  step("Arrancando la base de datos de la demo…");
  const pg = new EmbeddedPostgres({
    databaseDir: PG_DIR,
    user: "postgres",
    password: "postgres",
    port: PG_PORT,
    persistent: true,
    // En Linux como root, Postgres no arranca: se le crea un usuario propio.
    createPostgresUser: process.platform === "linux" && process.getuid?.() === 0,
    onLog: () => {},
    onError: () => {},
  });
  if (!existsSync(path.join(PG_DIR, "PG_VERSION"))) await pg.initialise();
  try {
    await pg.start();
  } catch (err) {
    // Si la ventana anterior se cerro de golpe, la base puede seguir corriendo: se reutiliza.
    const probe = pg.getPgClient();
    try {
      await probe.connect();
      await probe.end();
    } catch {
      throw err;
    }
  }
  try {
    await pg.createDatabase("rms");
  } catch {
    /* ya existe */
  }

  const env = {
    ...process.env,
    DATABASE_URL: `postgresql://postgres:postgres@localhost:${PG_PORT}/rms`,
    JWT_SECRET: jwtSecret,
    PORT: String(APP_PORT),
  };

  step("Preparando la base de datos…");
  run("npx", ["prisma", "generate", "--schema=server/prisma/schema.prisma"], { env, stdio: "ignore" });
  run("npx", ["prisma", "migrate", "deploy", "--schema=server/prisma/schema.prisma"], { env });

  const seededFile = path.join(DATA, `cargado-${SEED}`);
  if (!existsSync(seededFile)) {
    step(`Cargando la carta (${SEED})…`);
    run("npx", ["tsx", "prisma/seed.ts"], { cwd: path.join(ROOT, "server"), env: { ...env, SEED } });
    writeFileSync(seededFile, new Date().toISOString());
  }

  if (!existsSync(path.join(ROOT, "server", "dist", "index.js")) || !existsSync(path.join(ROOT, "web", "dist", "index.html"))) {
    step("Compilando el sistema (solo la primera vez, tarda un par de minutos)…");
    run("npm", ["run", "build"], { env });
  }

  // Si ya hay una demo abierta (otra ventana), no se arranca otra encima.
  try {
    const res = await fetch(`http://localhost:${APP_PORT}/api/health`);
    if (res.ok) {
      console.log(`\nYa hay una demo abierta en otra ventana: entra a http://localhost:${APP_PORT}`);
      openBrowser(`http://localhost:${APP_PORT}`);
      return;
    }
    console.error(`\n✖ El puerto ${APP_PORT} está ocupado por otro programa. Ciérralo y vuelve a intentar.`);
    process.exit(1);
  } catch {
    /* puerto libre: seguimos */
  }

  step("Arrancando el sistema…");
  const server = spawn(process.execPath, ["server/dist/index.js"], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "ignore", "inherit"],
  });

  let stopping = false;
  async function shutdown() {
    if (stopping) return;
    stopping = true;
    console.log("\nCerrando la demo…");
    server.kill();
    await pg.stop().catch(() => undefined);
    process.exit(0);
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  server.on("exit", (code) => {
    if (!stopping) {
      console.error(`\n✖ El sistema se detuvo (código ${code}). Revisa el mensaje de arriba.`);
      shutdown();
    }
  });

  const ok = await waitForHealth(`http://localhost:${APP_PORT}/api/health`);
  if (!ok) {
    console.error("\n✖ El sistema no respondió. Revisa los mensajes de arriba.");
    return shutdown();
  }

  const ip = lanAddress();
  const base = `http://${ip}:${APP_PORT}`;

  // QR de la Mesa 1 directo en la pantalla, para probar desde el celular sin imprimir nada.
  const client = pg.getPgClient("rms");
  await client.connect();
  const { rows } = await client.query(`SELECT "publicToken" FROM "RestaurantTable" WHERE label = '1' AND archived = false LIMIT 1`);
  await client.end();
  const table1 = rows[0] ? `${base}/m/${rows[0].publicToken}` : null;

  const line = "═".repeat(66);
  console.log(`\n${line}`);
  console.log("  RMS Cafés — demo funcionando en este computador");
  console.log(line);
  console.log(`  En este computador:          ${base}`);
  console.log(`  Desde un celular (mismo Wi-Fi): ${base}`);
  console.log("");
  console.log("  PIN:  Dueño 1234 · Mesero 1111 · Cocina 2222 · Barra 3333 · Caja 4444");
  console.log("  Los QR de todas las mesas: entra como Dueño → Códigos QR.");
  if (table1) {
    console.log("\n  Escanea este QR con el celular para pedir como cliente (Mesa 1):\n");
    console.log(await QRCode.toString(table1, { type: "terminal", small: true }));
    console.log(`  ${table1}`);
  }
  console.log(`\n  Si el celular no abre la página: Windows debe permitir Node.js en "Redes privadas".`);
  console.log("  No cierres esta ventana mientras uses la demo. Para salir: Ctrl + C.");
  console.log(line);

  openBrowser(base);
}

main().catch((err) => {
  console.error("\n✖ No se pudo arrancar la demo:", err?.message ?? err);
  process.exit(1);
});
