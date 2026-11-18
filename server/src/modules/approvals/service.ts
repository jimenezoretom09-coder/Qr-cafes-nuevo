import { PrismaClient } from "@prisma/client";
import { Server as SocketIOServer } from "socket.io";
import { rooms, PERMISSIONS, type ApprovalRequestDTO, type ApprovalType } from "@rms/shared";
import { recordAudit } from "../audit/service.js";
import { updateOrderItemStatus, cancelWholeOrder, applyDiscountToOrder } from "../orders/service.js";
import { refundPayment } from "../payments/service.js";

const APPROVE_PERMISSION_BY_TYPE: Record<ApprovalType, string> = {
  DISCOUNT: PERMISSIONS.DISCOUNTS_APPROVE,
  VOID_ITEM: PERMISSIONS.VOID_APPROVE,
  VOID_ORDER: PERMISSIONS.VOID_APPROVE,
  REFUND: PERMISSIONS.REFUNDS_APPROVE,
};

const requestInclude = { requestedBy: true, decidedBy: true } as const;
type ApprovalRow = Awaited<ReturnType<typeof loadApproval>>;

async function loadApproval(prisma: PrismaClient, id: string) {
  return prisma.approvalRequest.findUniqueOrThrow({ where: { id }, include: requestInclude });
}

function toApprovalDTO(row: ApprovalRow): ApprovalRequestDTO {
  return {
    id: row.id,
    type: row.type as ApprovalType,
    status: row.status as ApprovalRequestDTO["status"],
    reason: row.reason,
    payload: row.payload ? JSON.parse(row.payload) : null,
    entityType: row.entityType,
    entityId: row.entityId,
    requestedById: row.requestedById,
    requestedByName: row.requestedBy.name,
    decidedById: row.decidedById,
    decidedByName: row.decidedBy?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
  };
}

async function applyEffect(prisma: PrismaClient, io: SocketIOServer, row: ApprovalRow) {
  const payload = row.payload ? JSON.parse(row.payload) : {};
  const actingUserId = row.decidedById ?? row.requestedById;

  switch (row.type as ApprovalType) {
    case "VOID_ITEM":
      await updateOrderItemStatus(prisma, io, {
        orderItemId: row.entityId,
        nextStatus: "CANCELLED",
        actingUserId,
      });
      break;
    case "VOID_ORDER":
      await cancelWholeOrder(prisma, io, row.entityId, actingUserId);
      break;
    case "DISCOUNT":
      await applyDiscountToOrder(prisma, row.entityId, payload as { discountType: "PERCENT" | "FIXED"; value: number }, actingUserId, row.reason ?? undefined);
      break;
    case "REFUND":
      await refundPayment(prisma, row.entityId, actingUserId);
      break;
  }
}

export interface CreateApprovalInput {
  type: ApprovalType;
  entityType: string;
  entityId: string;
  reason?: string;
  payload?: Record<string, unknown>;
  requestedById: string;
  requesterPermissions: string[];
}

export async function requestApproval(prisma: PrismaClient, io: SocketIOServer, input: CreateApprovalInput) {
  const requiredPermission = APPROVE_PERMISSION_BY_TYPE[input.type];
  const autoApprove = input.requesterPermissions.includes(requiredPermission);

  const row = await prisma.approvalRequest.create({
    data: {
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      reason: input.reason,
      payload: input.payload ? JSON.stringify(input.payload) : null,
      requestedById: input.requestedById,
      status: autoApprove ? "APPROVED" : "PENDING",
      decidedById: autoApprove ? input.requestedById : null,
      decidedAt: autoApprove ? new Date() : null,
    },
    include: requestInclude,
  });

  await recordAudit(prisma, {
    userId: input.requestedById,
    action: autoApprove ? "APPROVAL_AUTO_APPROVED" : "APPROVAL_REQUESTED",
    entityType: "ApprovalRequest",
    entityId: row.id,
    metadata: { type: input.type, entityType: input.entityType, entityId: input.entityId },
  });

  if (autoApprove) {
    await applyEffect(prisma, io, row);
  } else {
    const dto = toApprovalDTO(row);
    io.to(rooms.role("MANAGER")).emit("approval:requested", dto);
    io.to(rooms.role("ADMIN")).emit("approval:requested", dto);
  }

  return toApprovalDTO(row);
}

export async function listApprovals(prisma: PrismaClient, status?: string) {
  const rows = await prisma.approvalRequest.findMany({
    where: status ? { status } : undefined,
    include: requestInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(toApprovalDTO);
}

export async function decideApproval(
  prisma: PrismaClient,
  io: SocketIOServer,
  approvalId: string,
  decision: "APPROVED" | "DENIED",
  decidedById: string,
  deciderPermissions: string[]
) {
  const existing = await prisma.approvalRequest.findUniqueOrThrow({ where: { id: approvalId } });
  if (existing.status !== "PENDING") throw new Error("Esta solicitud ya fue resuelta");

  const requiredPermission = APPROVE_PERMISSION_BY_TYPE[existing.type as ApprovalType];
  if (!deciderPermissions.includes(requiredPermission)) {
    throw new Error("No tienes permiso para decidir este tipo de solicitud");
  }

  const updated = await prisma.approvalRequest.update({
    where: { id: approvalId },
    data: { status: decision, decidedById, decidedAt: new Date() },
    include: requestInclude,
  });

  await recordAudit(prisma, {
    userId: decidedById,
    action: `APPROVAL_${decision}`,
    entityType: "ApprovalRequest",
    entityId: approvalId,
    metadata: { type: updated.type },
  });

  if (decision === "APPROVED") {
    await applyEffect(prisma, io, updated);
  }

  const dto = toApprovalDTO(updated);
  io.to(rooms.waiter(updated.requestedById)).emit("approval:decided", dto);
  io.to(rooms.role("MANAGER")).emit("approval:decided", dto);
  io.to(rooms.role("ADMIN")).emit("approval:decided", dto);
  return dto;
}
