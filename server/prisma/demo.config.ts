import type { RestaurantConfig } from "./restaurant.config.js";

/**
 * "Café Demo": una carta de café completa para mostrar el sistema en una visita de venta.
 * Se carga con:  SEED=demo npm run db:seed --workspace=server
 * Precios en miles de pesos (8.5 = $8.500).
 */
export const demoCafeConfig: RestaurantConfig = {
  businessName: "Café Demo",

  stations: [
    { name: "Barra", color: "#7c3aed" },
    { name: "Cocina", color: "#dc2626" },
  ],

  tables: [
    { label: "1", capacity: 2, zone: "Terraza" },
    { label: "2", capacity: 2, zone: "Terraza" },
    { label: "3", capacity: 4, zone: "Terraza" },
    { label: "4", capacity: 4, zone: "Terraza" },
    { label: "5", capacity: 4, zone: "Jardín" },
    { label: "6", capacity: 6, zone: "Jardín" },
  ],

  staff: [
    { name: "Dueño", roleName: "ADMIN", pin: "1234" },
    { name: "Mesero", roleName: "WAITER", pin: "1111" },
    { name: "Cocina", roleName: "KITCHEN", pin: "2222" },
    { name: "Barista", roleName: "BAR", pin: "3333" },
    { name: "Caja", roleName: "CASHIER", pin: "4444" },
  ],

  modifierGroups: [
    {
      key: "leche",
      name: "Tipo de leche",
      minSelect: 1,
      maxSelect: 1,
      modifiers: [
        { name: "Entera", priceDelta: 0 },
        { name: "Deslactosada", priceDelta: 0 },
        { name: "Almendras", priceDelta: 2 },
        { name: "Avena", priceDelta: 2 },
      ],
    },
    {
      key: "tamano",
      name: "Tamaño",
      minSelect: 1,
      maxSelect: 1,
      modifiers: [
        { name: "Mediano (8 oz)", priceDelta: 0 },
        { name: "Grande (12 oz)", priceDelta: 2 },
      ],
    },
    {
      key: "extras-cafe",
      name: "Extras",
      minSelect: 0,
      maxSelect: 3,
      modifiers: [
        { name: "Shot extra de espresso", priceDelta: 2.5 },
        { name: "Sirope de vainilla", priceDelta: 1.5 },
        { name: "Sirope de caramelo", priceDelta: 1.5 },
        { name: "Crema batida", priceDelta: 1.5 },
      ],
    },
    {
      key: "huevos",
      name: "Huevos",
      minSelect: 1,
      maxSelect: 1,
      modifiers: [
        { name: "Revueltos", priceDelta: 0 },
        { name: "Fritos", priceDelta: 0 },
        { name: "Pochados", priceDelta: 1 },
      ],
    },
  ],

  categories: [
    { name: "Cafés", sortOrder: 1, mealPeriod: "ALL", stationName: "Barra" },
    { name: "Bebidas frías", sortOrder: 2, mealPeriod: "ALL", stationName: "Barra" },
    { name: "Desayunos", sortOrder: 3, mealPeriod: "ALL", stationName: "Cocina" },
    { name: "Panadería", sortOrder: 4, mealPeriod: "ALL", stationName: "Cocina" },
    { name: "Postres", sortOrder: 5, mealPeriod: "ALL", stationName: "Cocina" },
  ],

  menuItems: [
    { name: "Espresso", description: "Doble carga de café de origen colombiano.", price: 5, categoryName: "Cafés", stationName: "Barra", course: "DRINK", preparationTimeEstimateMin: 3 },
    { name: "Americano", description: "Espresso alargado con agua caliente.", price: 5.5, categoryName: "Cafés", stationName: "Barra", course: "DRINK", preparationTimeEstimateMin: 3, modifierGroupKeys: ["tamano"] },
    { name: "Capuchino", description: "Espresso, leche texturizada y espuma cremosa.", price: 8.5, categoryName: "Cafés", stationName: "Barra", course: "DRINK", preparationTimeEstimateMin: 5, modifierGroupKeys: ["tamano", "leche", "extras-cafe"] },
    { name: "Latte", description: "Espresso suave con mucha leche.", price: 8.5, categoryName: "Cafés", stationName: "Barra", course: "DRINK", preparationTimeEstimateMin: 5, modifierGroupKeys: ["tamano", "leche", "extras-cafe"] },
    { name: "Mocaccino", description: "Espresso, chocolate y leche, con crema.", price: 10, categoryName: "Cafés", stationName: "Barra", course: "DRINK", preparationTimeEstimateMin: 6, modifierGroupKeys: ["tamano", "leche"] },
    { name: "Cold brew", description: "Café infusionado en frío por 18 horas.", price: 9, categoryName: "Bebidas frías", stationName: "Barra", course: "DRINK", preparationTimeEstimateMin: 2 },
    { name: "Frappé de caramelo", description: "Café, hielo, leche y caramelo.", price: 12, categoryName: "Bebidas frías", stationName: "Barra", course: "DRINK", preparationTimeEstimateMin: 6, modifierGroupKeys: ["leche", "extras-cafe"] },
    { name: "Limonada de coco", description: "Limón, leche de coco y hielo.", price: 9.5, categoryName: "Bebidas frías", stationName: "Barra", course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Desayuno de la casa", description: "Huevos al gusto, arepa, queso campesino y fruta.", price: 18, categoryName: "Desayunos", stationName: "Cocina", course: "MAIN", preparationTimeEstimateMin: 12, modifierGroupKeys: ["huevos"] },
    { name: "Tostada de aguacate", description: "Pan de masa madre, aguacate, huevo pochado y semillas.", price: 19, categoryName: "Desayunos", stationName: "Cocina", course: "MAIN", preparationTimeEstimateMin: 10 },
    { name: "Waffles con frutos rojos", description: "Waffles, frutos rojos, miel y crema.", price: 17, categoryName: "Desayunos", stationName: "Cocina", course: "MAIN", preparationTimeEstimateMin: 12 },
    { name: "Croissant de mantequilla", description: "Hojaldre recién horneado.", price: 6.5, categoryName: "Panadería", stationName: "Cocina", course: "STARTER", preparationTimeEstimateMin: 3 },
    { name: "Croissant de jamón y queso", description: "Gratinado al horno.", price: 11, categoryName: "Panadería", stationName: "Cocina", course: "STARTER", preparationTimeEstimateMin: 6 },
    { name: "Pandebono", description: "Tradicional, recién salido del horno.", price: 3.5, categoryName: "Panadería", stationName: "Cocina", course: "STARTER", preparationTimeEstimateMin: 2 },
    { name: "Cheesecake de maracuyá", description: "Base de galleta y salsa de maracuyá.", price: 12, categoryName: "Postres", stationName: "Cocina", course: "DESSERT", preparationTimeEstimateMin: 3 },
    { name: "Brownie con helado", description: "Brownie tibio con helado de vainilla.", price: 13, categoryName: "Postres", stationName: "Cocina", course: "DESSERT", preparationTimeEstimateMin: 5 },
  ],
};
