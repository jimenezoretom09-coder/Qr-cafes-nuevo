/**
 * Prepara el video de un plato para la carta del comensal.
 *
 * Toma el video tal como salio del celular (pesado, vertical u horizontal, con audio) y deja
 * dos archivos listos en web/public: un mp4 liviano y una foto de portada sacada del propio
 * video. La portada importa porque es lo que ve el comensal mientras el video carga.
 *
 * Uso:
 *   node scripts/preparar-video-plato.mjs "C:\\ruta\\ajiaco.mp4" ajiaco
 *
 * Deja:
 *   web/public/videos/ajiaco.mp4   -> videoUrl = /videos/ajiaco.mp4
 *   web/public/fotos/ajiaco.jpg    -> imageUrl = /fotos/ajiaco.jpg
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";

const [origen, nombreSalida] = process.argv.slice(2);

if (!origen || !nombreSalida) {
  console.error('Uso: node scripts/preparar-video-plato.mjs "<ruta del video>" <nombre-corto>');
  process.exit(1);
}
if (!existsSync(origen)) {
  console.error(`No encontre el archivo: ${origen}`);
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(nombreSalida)) {
  console.error("El nombre corto solo puede tener minusculas, numeros y guiones. Ej: medio-ajiaco");
  process.exit(1);
}

const raizWeb = resolve(import.meta.dirname, "../../web/public");
const carpetaVideos = resolve(raizWeb, "videos");
const carpetaFotos = resolve(raizWeb, "fotos");
mkdirSync(carpetaVideos, { recursive: true });
mkdirSync(carpetaFotos, { recursive: true });

const salidaVideo = resolve(carpetaVideos, `${nombreSalida}.mp4`);
const salidaFoto = resolve(carpetaFotos, `${nombreSalida}.jpg`);

const mb = (ruta) => (statSync(ruta).size / (1024 * 1024)).toFixed(2);

console.log(`Procesando ${basename(origen)} (${mb(origen)} MB)...`);

// -an quita el audio: la carta se ve en la mesa, con ruido de restaurante, y el audio solo
// suma peso. crf 28 + escala a 720 de ancho deja clips de pocos cientos de KB.
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-loglevel", "error",
    "-i", origen,
    "-an",
    "-vcodec", "libx264",
    "-crf", "28",
    "-preset", "slow",
    "-movflags", "+faststart",
    "-vf", "scale=720:-2,fps=24",
    "-t", "10",
    salidaVideo,
  ],
  { stdio: ["ignore", "ignore", "inherit"] }
);

// Portada: se toma del segundo 1 (el frame 0 suele salir movido o en negro).
// -update 1 le dice al muxer que es una sola imagen y no una secuencia numerada.
execFileSync(
  "ffmpeg",
  ["-y", "-loglevel", "error", "-ss", "1", "-i", salidaVideo, "-frames:v", "1", "-update", "1", "-q:v", "3", salidaFoto],
  { stdio: ["ignore", "ignore", "inherit"] }
);

console.log(`\nListo:`);
console.log(`  video: web/public/videos/${nombreSalida}.mp4  (${mb(salidaVideo)} MB)`);
console.log(`  foto:  web/public/fotos/${nombreSalida}.jpg   (${mb(salidaFoto)} MB)`);
console.log(`\nEn Admin > Menu, en el plato correspondiente:`);
console.log(`  Link del video: /videos/${nombreSalida}.mp4`);
console.log(`  Link de la foto: /fotos/${nombreSalida}.jpg`);
