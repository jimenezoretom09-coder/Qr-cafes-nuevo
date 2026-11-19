import { PrismaClient } from "@prisma/client";
import type { MealPeriod, MenuCategoryDTO } from "@rms/shared";

const menuInclude = {
  items: {
    where: { archived: false },
    include: {
      modifierGroups: { include: { group: { include: { modifiers: true } } } },
    },
  },
} as const;

export async function getMenuTree(prisma: PrismaClient): Promise<MenuCategoryDTO[]> {
  const categories = await prisma.menuCategory.findMany({
    where: { archived: false },
    include: menuInclude,
    orderBy: { sortOrder: "asc" },
  });

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    sortOrder: cat.sortOrder,
    mealPeriod: cat.mealPeriod as MealPeriod,
    items: cat.items.map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      videoUrl: item.videoUrl,
      allergens: item.allergens,
      includesDrink: item.includesDrink,
      isIncludedDrink: item.isIncludedDrink,
      isAdult: item.isAdult,
      price: item.price.toNumber(),
      available: item.available,
      stationId: item.stationId,
      preparationTimeEstimateMin: item.preparationTimeEstimateMin,
      course: item.course as MenuCategoryDTO["items"][number]["course"],
      modifierGroups: item.modifierGroups.map((link) => ({
        id: link.group.id,
        name: link.group.name,
        minSelect: link.group.minSelect,
        maxSelect: link.group.maxSelect,
        modifiers: link.group.modifiers.map((m) => ({
          id: m.id,
          name: m.name,
          priceDelta: m.priceDelta.toNumber(),
        })),
      })),
    })),
  }));
}

/** Archives (soft-deletes) a menu item, then archives its category too if that was the last
 * active item in it — hard-deleting is avoided because past orders still reference this row. */
export async function archiveMenuItem(prisma: PrismaClient, itemId: string) {
  const item = await prisma.menuItem.update({ where: { id: itemId }, data: { archived: true } });

  const remaining = await prisma.menuItem.count({
    where: { categoryId: item.categoryId, archived: false },
  });
  if (remaining === 0) {
    await prisma.menuCategory.update({ where: { id: item.categoryId }, data: { archived: true } });
  }

  return { categoryArchived: remaining === 0 };
}
