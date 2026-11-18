import { PrismaClient } from "@prisma/client";

let cachedId: string | null = null;

/** The system User that owns orders placed by diners directly (no waiter involved). */
export async function getSelfServiceUserId(prisma: PrismaClient): Promise<string> {
  if (cachedId) return cachedId;
  const user = await prisma.user.findFirstOrThrow({ where: { role: { name: "AUTOSERVICIO" } } });
  cachedId = user.id;
  return cachedId;
}
