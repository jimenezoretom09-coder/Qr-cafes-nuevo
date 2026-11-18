import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const prisma = new PrismaClient();

const ROLE_NAME = "AUTOSERVICIO";
const USER_NAME = "Pedido directo (QR mesa)";

async function main() {
  const role = await prisma.role.upsert({
    where: { name: ROLE_NAME },
    update: {},
    create: { name: ROLE_NAME, isSystem: true },
  });

  const existing = await prisma.user.findFirst({ where: { name: USER_NAME } });
  if (existing) {
    console.log("El usuario de autoservicio ya existe:", existing.id);
    return;
  }

  // Never used to log in from the PIN pad — random and never shared.
  const randomPin = crypto.randomInt(100000, 999999).toString();
  const pinHash = await bcrypt.hash(randomPin, 10);
  const user = await prisma.user.create({
    data: { name: USER_NAME, pinHash, roleId: role.id },
  });
  console.log("Usuario de autoservicio creado:", user.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
