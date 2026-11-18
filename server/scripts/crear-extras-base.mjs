/**
 * Deja creados los dos grupos de extras que pidio Jimena:
 *
 *  1. "¿Con qué proteína?" — obligatorio, una sola: los frijoles (y demas sancochos) se piden
 *     con carne de res, cerdo, costilla, bondiola, chicharron, chorizo o pechuga.
 *  2. "Adicionales" — opcional, varios: porciones sueltas con su precio, para que el mesero
 *     las agregue sin escribirlas a mano y queden cobradas.
 *
 * Es idempotente: se puede volver a correr sin duplicar nada. Todo esto se puede cambiar
 * despues desde Admin > Extras.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GRUPOS = [
  {
    name: "¿Con qué proteína?",
    minSelect: 1,
    maxSelect: 1,
    opciones: [
      { name: "Carne de res", priceDelta: 0 },
      { name: "Carne de cerdo", priceDelta: 0 },
      { name: "Costilla", priceDelta: 0 },
      { name: "Bondiola", priceDelta: 0 },
      { name: "Chicharrón", priceDelta: 0 },
      { name: "Chorizo", priceDelta: 0 },
      { name: "Pechuga", priceDelta: 0 },
    ],
    // Los sancochos y frijoles se piden eligiendo la proteina.
    platos: ["Frijoles", "1/2 Frijol"],
  },
  {
    name: "Adicionales",
    minSelect: 0,
    maxSelect: 6,
    // Precios tomados de los mismos platos que ya existen en Entradas.
    opciones: [
      { name: "Porción de arroz", priceDelta: 4 },
      { name: "Porción de aguacate", priceDelta: 5 },
      { name: "Arepa", priceDelta: 4.5 },
      { name: "Huevo", priceDelta: 2 },
      { name: "Chicharrón", priceDelta: 6 },
      { name: "Plátano asado", priceDelta: 6 },
    ],
    // Aplica a los almuerzos, que es donde se piden adicionales.
    categoriasDePlatos: ["Sancocho", "Carnes"],
  },
];

async function main() {
  for (const def of GRUPOS) {
    let grupo = await prisma.modifierGroup.findFirst({ where: { name: def.name } });
    if (!grupo) {
      grupo = await prisma.modifierGroup.create({
        data: { name: def.name, minSelect: def.minSelect, maxSelect: def.maxSelect },
      });
      console.log(`Grupo creado: ${def.name}`);
    } else {
      await prisma.modifierGroup.update({
        where: { id: grupo.id },
        data: { minSelect: def.minSelect, maxSelect: def.maxSelect },
      });
      console.log(`Grupo ya existía: ${def.name}`);
    }

    for (const op of def.opciones) {
      const existe = await prisma.modifier.findFirst({ where: { groupId: grupo.id, name: op.name } });
      if (existe) {
        await prisma.modifier.update({ where: { id: existe.id }, data: { priceDelta: op.priceDelta } });
      } else {
        await prisma.modifier.create({ data: { groupId: grupo.id, ...op } });
      }
    }
    console.log(`  opciones: ${def.opciones.map((o) => o.name).join(", ")}`);

    const platos = await prisma.menuItem.findMany({
      where: {
        archived: false,
        ...(def.platos ? { name: { in: def.platos } } : {}),
        ...(def.categoriasDePlatos ? { category: { name: { in: def.categoriasDePlatos } } } : {}),
      },
      select: { id: true, name: true },
    });

    await prisma.menuItemModifierGroup.createMany({
      data: platos.map((p) => ({ groupId: grupo.id, menuItemId: p.id })),
      skipDuplicates: true,
    });
    console.log(`  aplicado a ${platos.length} platos: ${platos.map((p) => p.name).join(", ")}\n`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
