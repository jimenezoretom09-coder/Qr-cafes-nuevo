import { PrismaClient } from "@prisma/client";

function normalize(question: string): string {
  return question.trim().toLowerCase().replace(/[¿?¡!.,]/g, "").replace(/\s+/g, " ");
}

/** Logs a question the assistant couldn't confidently answer — de-duped by normalized text so
 * the same question asked by different diners just bumps a counter instead of piling up rows. */
export async function logUnansweredQuestion(prisma: PrismaClient, question: string) {
  const normalizedText = normalize(question);
  if (!normalizedText) return;

  const existing = await prisma.unansweredQuestion.findUnique({ where: { normalizedText } });
  if (existing) {
    if (existing.resolved) return; // ya se convirtio en FAQ, no la reabrimos por un duplicado
    await prisma.unansweredQuestion.update({
      where: { id: existing.id },
      data: { timesAsked: { increment: 1 } },
    });
    return;
  }

  await prisma.unansweredQuestion.create({ data: { question, normalizedText } });
}
