import { PrismaClient } from "@prisma/client";
import { round2, type CashSessionDTO, type PaymentMethod } from "@rms/shared";
import { recordAudit } from "../audit/service.js";

const sessionInclude = {
  openedBy: true,
  closedBy: true,
  payments: true,
} as const;

type SessionWithPayments = Awaited<ReturnType<typeof loadSession>>;

async function loadSession(prisma: PrismaClient, id: string) {
  return prisma.cashSession.findUniqueOrThrow({ where: { id }, include: sessionInclude });
}

function toCashSessionDTO(session: SessionWithPayments): CashSessionDTO {
  const totalsByMethod: Record<PaymentMethod, number> = { CASH: 0, CARD: 0, DIGITAL: 0 };
  for (const payment of session.payments) {
    if (payment.refunded) continue;
    const method = payment.method as PaymentMethod;
    totalsByMethod[method] = round2(totalsByMethod[method] + payment.amount.toNumber());
  }

  return {
    id: session.id,
    openedById: session.openedById,
    openedByName: session.openedBy.name,
    closedById: session.closedById,
    closedByName: session.closedBy?.name ?? null,
    openingAmount: session.openingAmount.toNumber(),
    closingAmountExpected: session.closingAmountExpected?.toNumber() ?? null,
    closingAmountCounted: session.closingAmountCounted?.toNumber() ?? null,
    discrepancy: session.discrepancy?.toNumber() ?? null,
    totalsByMethod,
    paymentCount: session.payments.filter((p) => !p.refunded).length,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
  };
}

export async function getCurrentSession(prisma: PrismaClient) {
  const session = await prisma.cashSession.findFirst({
    where: { closedAt: null },
    include: sessionInclude,
    orderBy: { openedAt: "desc" },
  });
  return session ? toCashSessionDTO(session) : null;
}

export async function openSession(prisma: PrismaClient, openedById: string, openingAmount: number) {
  const existing = await prisma.cashSession.findFirst({ where: { closedAt: null } });
  if (existing) throw new Error("Ya hay una caja abierta. Ciérrala antes de abrir otra.");

  const session = await prisma.cashSession.create({
    data: { openedById, openingAmount },
    include: sessionInclude,
  });
  await recordAudit(prisma, {
    userId: openedById,
    action: "CASH_SESSION_OPENED",
    entityType: "CashSession",
    entityId: session.id,
    metadata: { openingAmount },
  });
  return toCashSessionDTO(session);
}

export async function closeSession(
  prisma: PrismaClient,
  sessionId: string,
  closedById: string,
  countedAmount: number
) {
  const session = await loadSession(prisma, sessionId);
  if (session.closedAt) throw new Error("Esta caja ya está cerrada");

  const cashTotal = session.payments
    .filter((p) => !p.refunded && p.method === "CASH")
    .reduce((sum, p) => sum + p.amount.toNumber(), 0);
  const expected = round2(session.openingAmount.toNumber() + cashTotal);
  const discrepancy = round2(countedAmount - expected);

  const updated = await prisma.cashSession.update({
    where: { id: sessionId },
    data: {
      closedById,
      closingAmountExpected: expected,
      closingAmountCounted: countedAmount,
      discrepancy,
      closedAt: new Date(),
    },
    include: sessionInclude,
  });

  await recordAudit(prisma, {
    userId: closedById,
    action: "CASH_SESSION_CLOSED",
    entityType: "CashSession",
    entityId: sessionId,
    metadata: { expected, countedAmount, discrepancy },
  });

  return toCashSessionDTO(updated);
}

export async function listSessions(prisma: PrismaClient) {
  const sessions = await prisma.cashSession.findMany({
    include: sessionInclude,
    orderBy: { openedAt: "desc" },
    take: 50,
  });
  return sessions.map(toCashSessionDTO);
}

export async function getSessionDetail(prisma: PrismaClient, sessionId: string) {
  return toCashSessionDTO(await loadSession(prisma, sessionId));
}
