import { FastifyInstance } from "fastify";
import { PERMISSIONS } from "@rms/shared";
import { requirePermission } from "../../middleware/rbac.js";

/** Opiniones que dejan los clientes desde su celular al terminar, para el dueño. */
export default async function feedbackRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/api/feedback", { preHandler: requirePermission(PERMISSIONS.REPORTS_VIEW) }, async () => {
    const rows = await fastify.prisma.feedback.findMany({
      include: { table: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const count = rows.length;
    const average = count ? rows.reduce((s, r) => s + r.rating, 0) / count : null;
    return {
      count,
      average,
      byRating: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: rows.filter((r) => r.rating === stars).length })),
      items: rows.map((r) => ({
        id: r.id,
        tableLabel: r.table.label,
        dinerName: r.dinerName,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });
}
