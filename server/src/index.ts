import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import socketPlugin from "./plugins/socket.js";
import authRoutes from "./modules/auth/routes.js";
import userRoutes from "./modules/users/routes.js";
import tableRoutes from "./modules/tables/routes.js";
import menuRoutes from "./modules/menu/routes.js";
import modifierRoutes from "./modules/menu/modifier-routes.js";
import orderRoutes from "./modules/orders/routes.js";
import cashSessionRoutes from "./modules/cash-sessions/routes.js";
import paymentRoutes from "./modules/payments/routes.js";
import approvalRoutes from "./modules/approvals/routes.js";
import reportRoutes from "./modules/reports/routes.js";
import customerRoutes from "./modules/customers/routes.js";
import selfOrderRoutes from "./modules/self-order/routes.js";
import assistantPublicRoutes, { assistantAdminRoutes } from "./modules/assistant/routes.js";
import ticketRoutes from "./modules/tickets/routes.js";
import serviceRequestRoutes from "./modules/service-requests/routes.js";
import pushRoutes from "./modules/push/routes.js";
import feedbackRoutes from "./modules/feedback/routes.js";
import { startDelayWatcher } from "./modules/orders/delay-watcher.js";

async function main() {
  const fastify = Fastify({ logger: true });

  // Reflects the request's own origin instead of a fixed one: this app is meant to be reached
  // from several devices on the restaurant's own Wi-Fi (tablets, KDS screen, cashier terminal)
  // via the host machine's LAN IP, which isn't known ahead of time. JWT auth is still required
  // on every route, so this isn't an open door — it just stops CORS from blocking legitimate
  // devices. Set CORS_ORIGIN to lock it down to a single origin if this ever leaves the LAN.
  await fastify.register(cors, { origin: process.env.CORS_ORIGIN ?? true });
  // global: false — solo las rutas que se marcan explicitamente con config.rateLimit quedan
  // limitadas (las rutas publicas del autopedido y del asistente, sin PIN de por medio).
  await fastify.register(rateLimit, { global: false });
  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);
  await fastify.register(socketPlugin);

  await fastify.register(authRoutes);
  await fastify.register(userRoutes);
  await fastify.register(tableRoutes);
  await fastify.register(menuRoutes);
  await fastify.register(modifierRoutes);
  await fastify.register(orderRoutes);
  await fastify.register(cashSessionRoutes);
  await fastify.register(paymentRoutes);
  await fastify.register(approvalRoutes);
  await fastify.register(reportRoutes);
  await fastify.register(customerRoutes);
  await fastify.register(selfOrderRoutes);
  await fastify.register(assistantPublicRoutes);
  await fastify.register(assistantAdminRoutes);
  await fastify.register(ticketRoutes);
  await fastify.register(serviceRequestRoutes);
  await fastify.register(pushRoutes);
  await fastify.register(feedbackRoutes);

  // Estado del servidor: que version del codigo corre y si llega a la base de datos. Con un
  // cliente por instalacion, sirve para saber que version tiene cada restaurante y para
  // confirmar desde afuera que un despliegue nuevo si arranco — si falla, Render sigue
  // sirviendo la version anterior sin avisar. Render tambien lo usa como chequeo de salud
  // (healthCheckPath en render.yaml) antes de pasarle trafico a una version nueva.
  fastify.get("/api/health", async (_request, reply) => {
    const version = process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? "local";
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return { ok: true, version };
    } catch {
      return reply.code(503).send({ ok: false, version, error: "Sin conexión a la base de datos" });
    }
  });

  // Serves the built React app from the same process/port as the API in production, so
  // there's a single server to keep running (no separate Vite process to manage). Only
  // present once `npm run build --workspace=web` has produced web/dist; dev mode keeps
  // using the separate Vite dev server on :5173 instead.
  const webDist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../web/dist");
  if (existsSync(webDist)) {
    await fastify.register(fastifyStatic, { root: webDist });
    fastify.setNotFoundHandler((request, reply) => {
      if (request.raw.url?.startsWith("/api")) {
        return reply.code(404).send({ error: "Not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  startDelayWatcher(fastify);

  const port = Number(process.env.PORT ?? 4000);
  await fastify.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
