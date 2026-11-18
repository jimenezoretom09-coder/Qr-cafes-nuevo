import { FastifyInstance } from "fastify";
import { PERMISSIONS } from "@rms/shared";
import { requirePermission } from "../../middleware/rbac.js";
import { getKitchenReport, getSalesReport } from "./service.js";

// "YYYY-MM-DD" strings parse as UTC midnight per the ECMAScript spec, but a restaurant's
// "today" means the calendar day at its own location — so build the Date from local
// year/month/day components instead of handing the raw string to `new Date(...)`.
function parseDateOnlyLocal(dateStr: string, endOfDay: boolean): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
}

function parseRange(query: { from?: string; to?: string }) {
  const from = query.from ? parseDateOnlyLocal(query.from, false) : new Date(new Date().setHours(0, 0, 0, 0));
  const to = query.to ? parseDateOnlyLocal(query.to, true) : new Date();
  if (!query.to) to.setHours(23, 59, 59, 999);
  return { from, to };
}

export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get(
    "/api/reports/sales",
    { preHandler: requirePermission(PERMISSIONS.REPORTS_VIEW) },
    async (request) => {
      const { from, to } = parseRange(request.query as { from?: string; to?: string });
      return getSalesReport(fastify.prisma, from, to);
    }
  );

  fastify.get(
    "/api/reports/kitchen",
    { preHandler: requirePermission(PERMISSIONS.REPORTS_VIEW) },
    async (request) => {
      const { from, to } = parseRange(request.query as { from?: string; to?: string });
      return getKitchenReport(fastify.prisma, from, to);
    }
  );
}
