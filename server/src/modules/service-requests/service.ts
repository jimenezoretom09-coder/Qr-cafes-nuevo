import { PrismaClient } from "@prisma/client";
import { Server as SocketIOServer } from "socket.io";
import { rooms, type ServiceRequestDTO } from "@rms/shared";
import { sendPushToRoles } from "../push/service.js";

type Row = Awaited<ReturnType<typeof loadRequest>>;

function loadRequest(prisma: PrismaClient, id: string) {
  return prisma.serviceRequest.findUniqueOrThrow({ where: { id }, include: { table: true } });
}

export function toServiceRequestDTO(r: Row): ServiceRequestDTO {
  return {
    id: r.id,
    tableId: r.tableId,
    tableLabel: r.table.label,
    type: r.type as ServiceRequestDTO["type"],
    billScope: r.billScope as ServiceRequestDTO["billScope"],
    paymentHint: r.paymentHint as ServiceRequestDTO["paymentHint"],
    tipPercent: r.tipPercent,
    dinerName: r.dinerName,
    status: r.status as ServiceRequestDTO["status"],
    createdAt: r.createdAt.toISOString(),
    attendedAt: r.attendedAt?.toISOString() ?? null,
  };
}

const PAYMENT_HINT_LABEL: Record<string, string> = { CASH: "efectivo", CARD: "tarjeta", TRANSFER: "transferencia" };

/**
 * El comensal llama al mesero o pide la cuenta. Si ya hay un llamado igual sin atender en esa
 * mesa no se crea otro (el comensal impaciente que toca el boton 5 veces), solo se vuelve a
 * avisar.
 */
export async function createServiceRequest(
  prisma: PrismaClient,
  io: SocketIOServer,
  params: {
    tableId: string;
    type: "WAITER" | "BILL";
    billScope?: "ALL" | "MINE";
    paymentHint?: "CASH" | "CARD" | "TRANSFER";
    tipPercent?: number;
    dinerId?: string;
    dinerName?: string;
  }
): Promise<ServiceRequestDTO> {
  const existing = await prisma.serviceRequest.findFirst({
    where: { tableId: params.tableId, type: params.type, status: "PENDING" },
  });

  const row = existing
    ? await prisma.serviceRequest.update({
        where: { id: existing.id },
        data: {
          billScope: params.billScope ?? existing.billScope,
          paymentHint: params.paymentHint ?? existing.paymentHint,
          tipPercent: params.tipPercent ?? existing.tipPercent,
          dinerName: params.dinerName ?? existing.dinerName,
        },
        include: { table: true },
      })
    : await prisma.serviceRequest.create({
        data: {
          tableId: params.tableId,
          type: params.type,
          billScope: params.type === "BILL" ? params.billScope ?? "ALL" : null,
          paymentHint: params.type === "BILL" ? params.paymentHint ?? null : null,
          tipPercent: params.type === "BILL" ? params.tipPercent ?? null : null,
          dinerId: params.dinerId,
          dinerName: params.dinerName,
        },
        include: { table: true },
      });

  if (params.type === "BILL") {
    await prisma.restaurantTable.update({ where: { id: params.tableId }, data: { status: "BILL_REQUESTED" } });
    io.to(rooms.global()).emit("table:status_changed", { tableId: params.tableId, status: "BILL_REQUESTED" });
  }

  const dto = toServiceRequestDTO(row);
  io.to(rooms.global()).emit("service:requested", dto);

  const who = dto.dinerName ? ` (${dto.dinerName})` : "";
  if (dto.type === "WAITER") {
    await sendPushToRoles(prisma, ["WAITER", "MANAGER", "ADMIN"], {
      title: `🙋 Mesa ${dto.tableLabel} llama al mesero`,
      body: `Te necesitan en la mesa${who}.`,
      url: "/waiter",
      tag: `service-${dto.id}`,
    });
  } else {
    const scope = dto.billScope === "MINE" ? `solo la de ${dto.dinerName ?? "un comensal"}` : "de toda la mesa";
    const hint = dto.paymentHint ? ` · Paga con ${PAYMENT_HINT_LABEL[dto.paymentHint]}` : "";
    const tip =
      dto.tipPercent === null ? "" : dto.tipPercent === 0 ? " · Sin propina" : ` · Propina ${dto.tipPercent}%`;
    await sendPushToRoles(prisma, ["WAITER", "CASHIER", "MANAGER", "ADMIN"], {
      title: `🧾 Mesa ${dto.tableLabel} pide la cuenta`,
      body: `Cuenta ${scope}${hint}${tip}.`,
      url: "/waiter",
      tag: `service-${dto.id}`,
    });
  }

  return dto;
}

export async function attendServiceRequest(
  prisma: PrismaClient,
  io: SocketIOServer,
  params: { id: string; userId: string }
): Promise<ServiceRequestDTO> {
  await prisma.serviceRequest.update({
    where: { id: params.id },
    data: { status: "ATTENDED", attendedAt: new Date(), attendedById: params.userId },
  });
  const dto = toServiceRequestDTO(await loadRequest(prisma, params.id));
  io.to(rooms.global()).emit("service:updated", dto);
  return dto;
}

export async function listPendingServiceRequests(prisma: PrismaClient): Promise<ServiceRequestDTO[]> {
  const rows = await prisma.serviceRequest.findMany({
    where: { status: "PENDING" },
    include: { table: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toServiceRequestDTO);
}
