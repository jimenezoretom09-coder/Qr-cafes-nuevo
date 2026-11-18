import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();

async function main() {
  // Respaldo completo antes de borrar nada, por si hiciera falta recuperar algo despues.
  const [orders, orderItems, orderItemModifiers, payments, paymentItems, approvals] = await Promise.all([
    prisma.order.findMany(),
    prisma.orderItem.findMany(),
    prisma.orderItemModifier.findMany(),
    prisma.payment.findMany(),
    prisma.paymentItem.findMany(),
    prisma.approvalRequest.findMany({ where: { entityType: { in: ["Order", "OrderItem"] } } }),
  ]);
  const backup = { orders, orderItems, orderItemModifiers, payments, paymentItems, approvals };
  const backupPath = new URL(`./orders-backup-${Date.now()}.json`, import.meta.url);
  writeFileSync(backupPath, JSON.stringify(backup, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
  console.log(`Respaldo guardado: ${backupPath.pathname} (${orders.length} pedidos)`);

  await prisma.paymentItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItemModifier.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.approvalRequest.deleteMany({ where: { entityType: { in: ["Order", "OrderItem"] } } });
  await prisma.order.deleteMany();
  console.log("Pedidos, pagos y aprobaciones relacionadas eliminados.");

  await prisma.customer.updateMany({ data: { points: 0, visitCount: 0, totalSpent: 0 } });
  console.log("Puntos e historial de clientes reiniciados a cero (se conservan nombre/telefono/correo).");

  await prisma.restaurantTable.updateMany({ data: { status: "FREE" } });
  console.log("Todas las mesas quedaron en estado LIBRE.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
