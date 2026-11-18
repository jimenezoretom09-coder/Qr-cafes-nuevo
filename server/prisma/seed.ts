import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLE_NAMES, type RoleName } from "@rms/shared";
import { restaurantConfig } from "./restaurant.config.js";

const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding: ${restaurantConfig.businessName}`);

  console.log("Roles y permisos...");
  const permissionRecords = await Promise.all(
    Object.values(PERMISSIONS).map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, category: key.split(":")[0] },
      })
    )
  );
  const permissionByKey = new Map(permissionRecords.map((p) => [p.key, p.id]));

  const roleRecords = new Map<string, string>();
  for (const roleName of Object.values(ROLE_NAMES)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, isSystem: true },
    });
    roleRecords.set(roleName, role.id);

    const grants = DEFAULT_ROLE_PERMISSIONS[roleName as RoleName];
    for (const permKey of grants) {
      const permissionId = permissionByKey.get(permKey);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  console.log("Usuario de autoservicio (pedidos por QR sin mesero)...");
  const autoservicioRole = await prisma.role.upsert({
    where: { name: "AUTOSERVICIO" },
    update: {},
    create: { name: "AUTOSERVICIO", isSystem: true },
  });
  const selfServiceUserName = "Pedido directo (QR mesa)";
  const existingSelfServiceUser = await prisma.user.findFirst({ where: { name: selfServiceUserName } });
  if (!existingSelfServiceUser) {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.user.create({
      data: { name: selfServiceUserName, pinHash: await bcrypt.hash(randomPin, 10), roleId: autoservicioRole.id },
    });
  }

  console.log("Personal...");
  for (const u of restaurantConfig.staff) {
    const pinHash = await bcrypt.hash(u.pin, 10);
    const roleId = roleRecords.get(u.roleName);
    if (!roleId) throw new Error(`Rol desconocido en restaurant.config.ts: "${u.roleName}"`);
    const existing = await prisma.user.findFirst({ where: { name: u.name } });
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { pinHash, roleId } });
    } else {
      await prisma.user.create({ data: { name: u.name, pinHash, roleId } });
    }
  }

  // El nombre que ve el comensal en la carta y el que usa el asistente IA salen del perfil del
  // restaurante, no de businessName: sin esto un cliente nuevo arranca mostrando
  // "MI RESTAURANTE". Solo se crea si no existe — si el dueño ya lo editó desde Admin, se respeta.
  console.log("Perfil del restaurante...");
  const existingProfile = await prisma.restaurantProfile.findFirst();
  if (!existingProfile) {
    await prisma.restaurantProfile.create({ data: { name: restaurantConfig.businessName } });
  }

  console.log("Estaciones de cocina...");
  const stations = new Map<string, string>();
  for (const s of restaurantConfig.stations) {
    const station = await prisma.kitchenStation.upsert({ where: { name: s.name }, update: {}, create: s });
    stations.set(s.name, station.id);
  }

  console.log("Mesas...");
  for (const [i, t] of restaurantConfig.tables.entries()) {
    await prisma.restaurantTable.upsert({
      where: { label: t.label },
      update: {},
      create: {
        label: t.label,
        capacity: t.capacity,
        zone: t.zone,
        posX: (i % 4) * 140 + 40,
        posY: Math.floor(i / 4) * 140 + 40,
      },
    });
  }

  console.log("Grupos de extras/modificadores...");
  const modifierGroupIdByKey = new Map<string, string>();
  for (const g of restaurantConfig.modifierGroups) {
    const groupId = await upsertModifierGroup(g.name, g.minSelect, g.maxSelect, g.modifiers);
    modifierGroupIdByKey.set(g.key, groupId);
  }

  console.log("Categorías del menú...");
  const categories = new Map<string, string>();
  for (const c of restaurantConfig.categories) {
    const stationId = stations.get(c.stationName);
    if (!stationId) throw new Error(`Estación desconocida en restaurant.config.ts: "${c.stationName}"`);
    const data = { name: c.name, sortOrder: c.sortOrder, mealPeriod: c.mealPeriod, defaultStationId: stationId };
    const existing = await prisma.menuCategory.findFirst({ where: { name: c.name } });
    const category = existing
      ? await prisma.menuCategory.update({ where: { id: existing.id }, data })
      : await prisma.menuCategory.create({ data });
    categories.set(c.name, category.id);
  }

  console.log("Platos del menú...");
  for (const item of restaurantConfig.menuItems) {
    const categoryId = categories.get(item.categoryName);
    const stationId = stations.get(item.stationName);
    if (!categoryId) throw new Error(`Categoría desconocida en restaurant.config.ts: "${item.categoryName}"`);
    if (!stationId) throw new Error(`Estación desconocida en restaurant.config.ts: "${item.stationName}"`);

    const data = {
      name: item.name,
      description: item.description,
      price: item.price,
      categoryId,
      stationId,
      course: item.course,
      preparationTimeEstimateMin: item.preparationTimeEstimateMin ?? 10,
    };
    const existing = await prisma.menuItem.findFirst({ where: { name: item.name } });
    const menuItem = existing
      ? await prisma.menuItem.update({ where: { id: existing.id }, data })
      : await prisma.menuItem.create({ data });

    for (const key of item.modifierGroupKeys ?? []) {
      const groupId = modifierGroupIdByKey.get(key);
      if (!groupId) throw new Error(`modifierGroupKey desconocido en restaurant.config.ts: "${key}"`);
      await prisma.menuItemModifierGroup.upsert({
        where: { menuItemId_groupId: { menuItemId: menuItem.id, groupId } },
        update: {},
        create: { menuItemId: menuItem.id, groupId },
      });
    }
  }

  console.log("\nListo.");
  console.log("PINs de personal:");
  for (const u of restaurantConfig.staff) console.log(`  ${u.name} (${u.roleName}) -> ${u.pin}`);
}

async function upsertModifierGroup(
  name: string,
  minSelect: number,
  maxSelect: number,
  modifiers: { name: string; priceDelta: number }[]
) {
  const existing = await prisma.modifierGroup.findFirst({ where: { name } });
  const group = existing
    ? await prisma.modifierGroup.update({ where: { id: existing.id }, data: { minSelect, maxSelect } })
    : await prisma.modifierGroup.create({ data: { name, minSelect, maxSelect } });

  for (const m of modifiers) {
    const existingMod = await prisma.modifier.findFirst({ where: { groupId: group.id, name: m.name } });
    if (existingMod) {
      await prisma.modifier.update({ where: { id: existingMod.id }, data: { priceDelta: m.priceDelta } });
    } else {
      await prisma.modifier.create({ data: { groupId: group.id, name: m.name, priceDelta: m.priceDelta } });
    }
  }
  return group.id;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
