import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { AuthUserDTO } from "@rms/shared";

const userWithRoleInclude = {
  role: { include: { permissions: { include: { permission: true } } } },
} as const;

type UserWithRole = Awaited<ReturnType<typeof findAllActiveUsers>>[number];

async function findAllActiveUsers(prisma: PrismaClient) {
  return prisma.user.findMany({ where: { active: true }, include: userWithRoleInclude });
}

export function toAuthUserDTO(user: UserWithRole): AuthUserDTO {
  return {
    id: user.id,
    name: user.name,
    roleId: user.roleId,
    roleName: user.role.name,
    permissions: user.role.permissions.map((rp) => rp.permission.key),
  };
}

export async function findUserByPin(prisma: PrismaClient, pin: string) {
  const users = await findAllActiveUsers(prisma);
  for (const user of users) {
    if (await bcrypt.compare(pin, user.pinHash)) {
      return user;
    }
  }
  return null;
}
