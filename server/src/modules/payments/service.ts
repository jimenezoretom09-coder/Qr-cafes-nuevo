import { PrismaClient } from "@prisma/client";
import type { PaymentDTO, PaymentMethod } from "@rms/shared";
import { recordAudit } from "../audit/service.js";

const paymentInclude = { createdBy: true, items: true, order: { include: { table: true } } } as const;

function toPaymentDTO(payment: Awaited<ReturnType<typeof listPayments>>[number]): PaymentDTO {
  return {
    id: payment.id,
    orderId: payment.orderId,
    tableLabel: payment.order.table.label,
    method: payment.method as PaymentMethod,
    subtotalAmount: payment.subtotalAmount.toNumber(),
    taxAmount: payment.taxAmount.toNumber(),
    serviceAmount: payment.serviceAmount.toNumber(),
    tipAmount: payment.tipAmount.toNumber(),
    amount: payment.amount.toNumber(),
    splitLabel: payment.splitLabel,
    createdById: payment.createdById,
    createdByName: payment.createdBy.name,
    cashSessionId: payment.cashSessionId,
    refunded: payment.refunded,
    itemIds: payment.items.map((i) => i.orderItemId),
    createdAt: payment.createdAt.toISOString(),
  };
}

export async function listPaymentsForSession(prisma: PrismaClient, cashSessionId: string) {
  const payments = await prisma.payment.findMany({
    where: { cashSessionId },
    include: paymentInclude,
    orderBy: { createdAt: "desc" },
  });
  return payments.map(toPaymentDTO);
}

export async function listPaymentsForOrder(prisma: PrismaClient, orderId: string) {
  const payments = await prisma.payment.findMany({
    where: { orderId },
    include: paymentInclude,
    orderBy: { createdAt: "asc" },
  });
  return payments.map(toPaymentDTO);
}

export async function listPayments(prisma: PrismaClient, cashSessionId: string) {
  return prisma.payment.findMany({ where: { cashSessionId }, include: paymentInclude });
}

export async function refundPayment(prisma: PrismaClient, paymentId: string, actingUserId: string) {
  const payment = await prisma.payment.update({ where: { id: paymentId }, data: { refunded: true, refundedAt: new Date() } });
  await recordAudit(prisma, {
    userId: actingUserId,
    action: "PAYMENT_REFUNDED",
    entityType: "Payment",
    entityId: paymentId,
    metadata: { orderId: payment.orderId, amount: payment.amount.toNumber() },
  });
}
