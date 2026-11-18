import { PrismaClient } from "@prisma/client";
import type { CustomerDTO } from "@rms/shared";

function toCustomerDTO(customer: {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  points: number;
  visitCount: number;
  totalSpent: { toNumber(): number };
  createdAt: Date;
}): CustomerDTO {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    points: customer.points,
    visitCount: customer.visitCount,
    totalSpent: customer.totalSpent.toNumber(),
    createdAt: customer.createdAt.toISOString(),
  };
}

export async function searchCustomers(prisma: PrismaClient, search: string) {
  const customers = await prisma.customer.findMany({
    where: search
      ? { OR: [{ phone: { contains: search } }, { name: { contains: search } }] }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return customers.map(toCustomerDTO);
}

export async function listCustomers(prisma: PrismaClient) {
  const customers = await prisma.customer.findMany({ orderBy: { totalSpent: "desc" } });
  return customers.map(toCustomerDTO);
}

export async function getCustomer(prisma: PrismaClient, id: string) {
  return toCustomerDTO(await prisma.customer.findUniqueOrThrow({ where: { id } }));
}

export async function createCustomer(
  prisma: PrismaClient,
  input: { name: string; phone?: string; email?: string }
) {
  if (input.phone) {
    const existing = await prisma.customer.findUnique({ where: { phone: input.phone } });
    if (existing) throw new Error(`Ya existe un cliente con el teléfono ${input.phone}: ${existing.name}`);
  }
  const customer = await prisma.customer.create({ data: input });
  return toCustomerDTO(customer);
}
