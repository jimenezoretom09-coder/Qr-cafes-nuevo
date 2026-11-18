import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PERMISSIONS } from "@rms/shared";
import { requirePermission } from "../../middleware/rbac.js";
import { createCustomer, getCustomer, listCustomers, searchCustomers } from "./service.js";
import { setOrderCustomer } from "../orders/service.js";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6).optional(),
  email: z.string().email().optional(),
});

const attachSchema = z.object({ customerId: z.string().nullable() });

export default async function customerRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get(
    "/api/customers",
    { preHandler: requirePermission(PERMISSIONS.CUSTOMERS_MANAGE) },
    async (request) => {
      const { search } = request.query as { search?: string };
      return search ? searchCustomers(fastify.prisma, search) : listCustomers(fastify.prisma);
    }
  );

  fastify.get(
    "/api/customers/:id",
    { preHandler: requirePermission(PERMISSIONS.CUSTOMERS_MANAGE) },
    async (request) => {
      const { id } = request.params as { id: string };
      return getCustomer(fastify.prisma, id);
    }
  );

  fastify.post(
    "/api/customers",
    { preHandler: requirePermission(PERMISSIONS.CUSTOMERS_MANAGE) },
    async (request, reply) => {
      const parsed = createSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

      try {
        const customer = await createCustomer(fastify.prisma, parsed.data);
        return reply.code(201).send(customer);
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    }
  );

  fastify.patch(
    "/api/orders/:id/customer",
    { preHandler: requirePermission(PERMISSIONS.CASH_MANAGE) },
    async (request, reply) => {
      const parsed = attachSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
      const { id } = request.params as { id: string };

      try {
        return await setOrderCustomer(fastify.prisma, id, parsed.data.customerId);
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    }
  );
}
