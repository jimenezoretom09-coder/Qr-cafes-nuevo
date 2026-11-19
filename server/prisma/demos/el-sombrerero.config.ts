import type { RestaurantConfig } from "../restaurant.config.js";

/**
 * El Sombrerero Café Brunch (La Casa del Sombrerero) — Av. Santander #75A-113, Milán, Manizales.
 * Carta tomada de "Carta Casa Sombrerero 2026.pdf" (versión del 17 oct 2026).
 *
 * Se carga con:  SEED=sombrerero npm run db:seed --workspace=server
 * Precios en miles de pesos (7.8 = $7.800), igual que en el panel admin.
 *
 * VERIFICAR CON EL CAFÉ: la página de Brunch/Lunch y la de Métodos del PDF tienen los precios
 * en columnas que el texto no deja emparejar con certeza; los marcados "VERIFICAR" son la
 * mejor lectura posible.
 */

const B = "Barra";
const C = "Cocina";
const K = "Coctelería";

export const sombrereroConfig: RestaurantConfig = {
  businessName: "El Sombrerero",

  profile: {
    description:
      "Café, brunch y coctelería inspirados en Alicia en el país de las maravillas. Todo comenzó con un jardín mágico que creció y se transformó en La Casa del Sombrerero: un lugar para compartir en familia y entre amigos. «Para cada persona hay un sombrero a su medida».",
    tone:
      "cálido, juguetón y un poco excéntrico, como el Sombrerero Loco, con guiños a Alicia en el país de las maravillas (la hora del té, el Conejo Blanco, el Gato de Cheshire) sin exagerar; siempre claro y preciso con precios y pedidos",
    address: "Av. Santander #75A-113, barrio Milán (frente al Colegio Santa Inés), Manizales",
    phone: "302 865 8932",
    policies:
      "Propina voluntaria sugerida del 10%, que el cliente puede aceptar, rechazar o modificar; se destina 100% al personal. Bebidas con alcohol solo para mayores de 18 años. Repostería y café especial de temporada cambian cada día: preguntar por las opciones del día.",
    primaryColor: "#1f4d47",
    accentColor: "#b8893b",
    tipSuggestionPercent: 10,
  },

  stations: [
    { name: B, color: "#1f4d47" },
    { name: C, color: "#8f1d2c" },
    { name: K, color: "#6b2f45" },
  ],

  tables: Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1), capacity: 4, zone: "Casa" })),

  staff: [
    { name: "Dueño", roleName: "ADMIN", pin: "1234" },
    { name: "Mesero", roleName: "WAITER", pin: "1111" },
    { name: "Cocina", roleName: "KITCHEN", pin: "2222" },
    { name: "Barra", roleName: "BAR", pin: "3333" },
    { name: "Caja", roleName: "CASHIER", pin: "4444" },
  ],

  modifierGroups: [
    {
      key: "licor-capuccino",
      name: "Licor",
      minSelect: 1,
      maxSelect: 1,
      modifiers: [
        { name: "Amaretto", priceDelta: 0 },
        { name: "Crema de cacao", priceDelta: 0 },
        { name: "Crema de whisky", priceDelta: 0 },
        { name: "Licor 43", priceDelta: 0 },
      ],
    },
    {
      key: "sabor-mojito",
      name: "Sabor",
      minSelect: 1,
      maxSelect: 1,
      modifiers: [
        { name: "Clásico", priceDelta: 0 },
        { name: "Fresa", priceDelta: 0 },
        { name: "Coco", priceDelta: 0 },
        { name: "Maracuyá", priceDelta: 0 },
      ],
    },
    {
      key: "gin-selva",
      name: "Gin",
      minSelect: 1,
      maxSelect: 1,
      modifiers: [
        { name: "Gordon's", priceDelta: 0 },
        { name: "London Dry Selva", priceDelta: 4 },
      ],
    },
    {
      key: "gin-tonic",
      name: "Gin",
      minSelect: 1,
      maxSelect: 1,
      modifiers: [
        { name: "Gordon's", priceDelta: 0 },
        { name: "London Dry Selva", priceDelta: 6 },
        { name: "Kin Ross Berry", priceDelta: 8 },
      ],
    },
    {
      key: "whisky-penicillin",
      name: "Whisky",
      minSelect: 1,
      maxSelect: 1,
      modifiers: [
        { name: "Grant's", priceDelta: 0 },
        { name: "Monkey Shoulder", priceDelta: 4 },
      ],
    },
    {
      key: "tamano-milo",
      name: "Tamaño",
      minSelect: 1,
      maxSelect: 1,
      modifiers: [
        { name: "Pequeño", priceDelta: 0 },
        { name: "Grande", priceDelta: 2 },
      ],
    },
    {
      key: "tazas-sifon",
      name: "Tazas",
      minSelect: 1,
      maxSelect: 1,
      modifiers: [
        { name: "1 taza", priceDelta: 0 },
        { name: "2 tazas", priceDelta: 4 },
      ],
    },
    {
      key: "tazas-prensa",
      name: "Tazas",
      minSelect: 1,
      maxSelect: 1,
      modifiers: [
        { name: "3 tazas", priceDelta: 0 },
        { name: "5 tazas", priceDelta: 7 },
      ],
    },
    {
      key: "sabor-hatsu",
      name: "Sabor",
      minSelect: 1,
      maxSelect: 1,
      modifiers: [
        { name: "Hierbabuena", priceDelta: 0 },
        { name: "Uva blanca y romero", priceDelta: 0 },
        { name: "Frambuesa y rosas", priceDelta: 0 },
        { name: "Sandía y albahaca", priceDelta: 0 },
      ],
    },
    {
      key: "sabor-juniper",
      name: "Sabor",
      minSelect: 1,
      maxSelect: 1,
      modifiers: [
        { name: "Lemongrass", priceDelta: 0 },
        { name: "Toronja rosada", priceDelta: 0 },
        { name: "Coco", priceDelta: 0 },
        { name: "Sidra de rosas", priceDelta: 0 },
        { name: "Dry", priceDelta: 0 },
        { name: "Elderflower", priceDelta: 0 },
      ],
    },
    {
      key: "adicion-helado",
      name: "Adición",
      minSelect: 0,
      maxSelect: 1,
      modifiers: [{ name: "Bola de helado", priceDelta: 6 }],
    },
  ],

  categories: [
    { name: "Brunch", sortOrder: 1, mealPeriod: "ALL", stationName: C },
    { name: "Lunch y tapas", sortOrder: 2, mealPeriod: "ALL", stationName: C },
    { name: "Panadería", sortOrder: 3, mealPeriod: "ALL", stationName: C },
    { name: "Repostería", sortOrder: 4, mealPeriod: "ALL", stationName: C },
    { name: "Cafés calientes", sortOrder: 5, mealPeriod: "ALL", stationName: B },
    { name: "Métodos de café", sortOrder: 6, mealPeriod: "ALL", stationName: B },
    { name: "Tés e infusiones", sortOrder: 7, mealPeriod: "ALL", stationName: B },
    { name: "Chocolates y más", sortOrder: 8, mealPeriod: "ALL", stationName: B },
    { name: "Cafés fríos y coldbrew", sortOrder: 9, mealPeriod: "ALL", stationName: B },
    { name: "Limonadas e ice tea", sortOrder: 10, mealPeriod: "ALL", stationName: B },
    { name: "Batidos y malteadas", sortOrder: 11, mealPeriod: "ALL", stationName: B },
    { name: "Sodas", sortOrder: 12, mealPeriod: "ALL", stationName: B },
    { name: "Cócteles", sortOrder: 13, mealPeriod: "ALL", stationName: K },
    { name: "Mocktails", sortOrder: 14, mealPeriod: "ALL", stationName: K },
    { name: "Cervezas", sortOrder: 15, mealPeriod: "ALL", stationName: K },
    { name: "Shots", sortOrder: 16, mealPeriod: "ALL", stationName: K },
  ],

  menuItems: [
    // ---- Brunch (VERIFICAR precios: columnas del PDF) ----
    { name: "Parfait Verlet", description: "Yogurt griego, granola, arándanos, fresa, banano y endulzado a elección con un toquecito de miel.", price: 16, categoryName: "Brunch", stationName: C, course: "MAIN", preparationTimeEstimateMin: 6 },
    { name: "Sándwich gourmet", description: "Pan focaccia, jamón catalán, queso mozzarella, lechuga, tomate y salsa de la casa.", price: 23, categoryName: "Brunch", stationName: C, course: "MAIN", preparationTimeEstimateMin: 12 },
    { name: "Sándwich media luna", description: "Croissant de mantequilla, jamón, queso mozzarella, lechuga y salsa de la casa.", price: 17, categoryName: "Brunch", stationName: C, course: "MAIN", preparationTimeEstimateMin: 10 },
    { name: "Media luna americana", description: "Croissant de mantequilla, carne de hamburguesa, queso americano, mermelada de tocineta y pesto.", price: 21, categoryName: "Brunch", stationName: C, course: "MAIN", preparationTimeEstimateMin: 12 },
    { name: "Bagel", description: "Pan bagel, mermelada de tocineta, huevo, pepino encurtido y sour cream.", price: 20, categoryName: "Brunch", stationName: C, course: "MAIN", preparationTimeEstimateMin: 10 },
    { name: "Tostadas Bel-Ami", description: "Pan de auyama sellado en aceite de oliva, jamón serrano, rúgula y salsa de la casa, con vinagre balsámico y el toque especial de la casa.", price: 20, categoryName: "Brunch", stationName: C, course: "MAIN", preparationTimeEstimateMin: 10 },
    { name: "Tostadas Rouge Bis", description: "Pan de centeno sellado en aceite de oliva, huevo y aguacate, con salsa especial de la casa.", price: 20, categoryName: "Brunch", stationName: C, course: "MAIN", preparationTimeEstimateMin: 10 },
    { name: "Cazuelita huevos pomodoro", description: "Huevos en salsa pomodoro.", price: 19, categoryName: "Brunch", stationName: C, course: "MAIN", preparationTimeEstimateMin: 12 },
    { name: "Panini", description: "Pan panini, pollo, maicitos y queso americano.", price: 23, categoryName: "Brunch", stationName: C, course: "MAIN", preparationTimeEstimateMin: 12 },

    // ---- Lunch y tapas (VERIFICAR precios) ----
    { name: "Nachos Dicha", description: "Nachos de maíz con salsas y carne molida en BBQ de la casa.", price: 23, categoryName: "Lunch y tapas", stationName: C, course: "STARTER", preparationTimeEstimateMin: 10 },
    { name: "Tapas Pomodoro", description: "Pan francés sellado en aceite de oliva, salsa pomodoro y reducción de vinagre balsámico.", price: 24, categoryName: "Lunch y tapas", stationName: C, course: "STARTER", preparationTimeEstimateMin: 10 },
    { name: "Tapas Champiñones", description: "Pan francés sellado en aceite de oliva, champiñones salteados en vino blanco y queso parmesano.", price: 24, categoryName: "Lunch y tapas", stationName: C, course: "STARTER", preparationTimeEstimateMin: 10 },
    { name: "Tapas Madurados", description: "Pan francés sellado en aceite de oliva con plátano maduro.", price: 25, categoryName: "Lunch y tapas", stationName: C, course: "STARTER", preparationTimeEstimateMin: 10 },
    { name: "Tapas Mixtas", description: "2 tapas pomodoro, 2 tapas champiñones y 1 tapa madurados.", price: 25, categoryName: "Lunch y tapas", stationName: C, course: "STARTER", preparationTimeEstimateMin: 12 },
    { name: "Bruska Verde", description: "Pan francés sellado en aceite de oliva, burrata, rúgula, sour cream, pomodoro y pesto.", price: 24, categoryName: "Lunch y tapas", stationName: C, course: "STARTER", preparationTimeEstimateMin: 10 },
    { name: "Canasta Pacífico", description: "Canastas de plátano y lomo de cerdo en salsa BBQ de la casa.", price: 24, categoryName: "Lunch y tapas", stationName: C, course: "STARTER", preparationTimeEstimateMin: 12 },
    { name: "Mini burger", description: "Blend de carnes 100% artesanal, pan brioche, queso americano, tocineta y salsa mostaza Sombrerero, con chips de papa.", price: 32, categoryName: "Lunch y tapas", stationName: C, course: "MAIN", preparationTimeEstimateMin: 15 },
    { name: "Chorrillanas", description: "Cerdo en BBQ de la casa, cebolla encurtida dulce, papas a la francesa, mermelada de tocineta y huevo frito.", price: 27, categoryName: "Lunch y tapas", stationName: C, course: "MAIN", preparationTimeEstimateMin: 15 },

    // ---- Panadería ----
    { name: "Croissant tradicional", price: 6.3, categoryName: "Panadería", stationName: C, course: "STARTER", preparationTimeEstimateMin: 3 },
    { name: "Croissant de jamón y queso", price: 7.5, categoryName: "Panadería", stationName: C, course: "STARTER", preparationTimeEstimateMin: 5 },
    { name: "Croissant de Nutella", price: 8.5, categoryName: "Panadería", stationName: C, course: "STARTER", preparationTimeEstimateMin: 4 },
    { name: "Croissant de queso crema", price: 8.5, categoryName: "Panadería", stationName: C, course: "STARTER", preparationTimeEstimateMin: 4 },
    { name: "Dedo de queso", price: 7.3, categoryName: "Panadería", stationName: C, course: "STARTER", preparationTimeEstimateMin: 4 },
    { name: "Dedo especial de queso y bocadillo", price: 7.8, categoryName: "Panadería", stationName: C, course: "STARTER", preparationTimeEstimateMin: 4 },
    { name: "Pastel de manzana y canela", price: 8.5, categoryName: "Panadería", stationName: C, course: "STARTER", preparationTimeEstimateMin: 4 },
    { name: "Pastel de pollo", price: 8, categoryName: "Panadería", stationName: C, course: "STARTER", preparationTimeEstimateMin: 4 },
    { name: "Pastel de tocineta caramelizada", price: 8.5, categoryName: "Panadería", stationName: C, course: "STARTER", preparationTimeEstimateMin: 4 },
    { name: "Chicharrón dulce de arequipe", price: 8, categoryName: "Panadería", stationName: C, course: "STARTER", preparationTimeEstimateMin: 3 },
    { name: "Chicharrón dulce de guayaba", price: 8, categoryName: "Panadería", stationName: C, course: "STARTER", preparationTimeEstimateMin: 3 },

    // ---- Repostería ----
    { name: "Torta de chocolate Hershey's", price: 13, categoryName: "Repostería", stationName: C, course: "DESSERT", preparationTimeEstimateMin: 3 },
    { name: "Torta de tres leches", price: 13, categoryName: "Repostería", stationName: C, course: "DESSERT", preparationTimeEstimateMin: 3 },
    { name: "New York Roll", description: "Pregunta por los sabores del día (ej. chocolate Nutella).", price: 13, categoryName: "Repostería", stationName: C, course: "DESSERT", preparationTimeEstimateMin: 3 },
    { name: "New York Roll de tamarindo", price: 13, categoryName: "Repostería", stationName: C, course: "DESSERT", preparationTimeEstimateMin: 3 },
    { name: "Solterita Roll", description: "New York roll relleno de crema tradicional de solterita y leche condensada.", price: 13, categoryName: "Repostería", stationName: C, course: "DESSERT", preparationTimeEstimateMin: 3 },
    { name: "Torta María Luisa", price: 12, categoryName: "Repostería", stationName: C, course: "DESSERT", preparationTimeEstimateMin: 3 },
    { name: "Torta de amapola", price: 12, categoryName: "Repostería", stationName: C, course: "DESSERT", preparationTimeEstimateMin: 3 },
    { name: "Torta de temporada", description: "Cambia cada día: pregunta por la de hoy.", price: 13, categoryName: "Repostería", stationName: C, course: "DESSERT", preparationTimeEstimateMin: 3 },

    // ---- Cafés calientes ----
    { name: "Espresso", price: 5.8, categoryName: "Cafés calientes", stationName: B, course: "DRINK", preparationTimeEstimateMin: 3 },
    { name: "Espresso doble", price: 7, categoryName: "Cafés calientes", stationName: B, course: "DRINK", preparationTimeEstimateMin: 3 },
    { name: "Americano", price: 7.8, categoryName: "Cafés calientes", stationName: B, course: "DRINK", preparationTimeEstimateMin: 3 },
    { name: "Americano doble", price: 9.8, categoryName: "Cafés calientes", stationName: B, course: "DRINK", preparationTimeEstimateMin: 3 },
    { name: "Rural", price: 8.2, categoryName: "Cafés calientes", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Un Manizaleño", description: "Americano, panela y especias.", price: 10.8, categoryName: "Cafés calientes", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Macchiato", price: 8.8, categoryName: "Cafés calientes", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Café bombón", price: 10.3, categoryName: "Cafés calientes", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Capuccino", price: 10.8, categoryName: "Cafés calientes", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Capuccino crema", price: 11.8, categoryName: "Cafés calientes", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Capuccino con licor", description: "Elige: amaretto, crema de cacao, crema de whisky o Licor 43.", price: 17.9, categoryName: "Cafés calientes", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5, modifierGroupKeys: ["licor-capuccino"], isAdult: true },
    { name: "Gato Sonriente", description: "Americano con Jägermeister.", price: 15.6, categoryName: "Cafés calientes", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4, isAdult: true },
    { name: "Flat White", price: 11.9, categoryName: "Cafés calientes", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Latte", price: 12.2, categoryName: "Cafés calientes", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Mockaccino", price: 11.2, categoryName: "Cafés calientes", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },

    // ---- Métodos (VERIFICAR precios por tazas) ----
    { name: "Chemex (4–5 tazas)", description: "(1941) Una taza más brillante, que resalta la acidez y las sensaciones ligeras.", price: 39, categoryName: "Métodos de café", stationName: B, course: "DRINK", preparationTimeEstimateMin: 10 },
    { name: "V60 (5 tazas)", description: "Una taza balanceada entre los sabores ácidos, amargos y dulces.", price: 35, categoryName: "Métodos de café", stationName: B, course: "DRINK", preparationTimeEstimateMin: 10 },
    { name: "Prensa francesa", description: "(1929) Una taza de sabor plano, con robusta sensación en boca.", price: 28, categoryName: "Métodos de café", stationName: B, course: "DRINK", preparationTimeEstimateMin: 8, modifierGroupKeys: ["tazas-prensa"] },
    { name: "Sifón japonés", description: "(1830) Un método sofisticado que combina dos procesos físicos: una taza limpia y de buen cuerpo.", price: 15, categoryName: "Métodos de café", stationName: B, course: "DRINK", preparationTimeEstimateMin: 12, modifierGroupKeys: ["tazas-sifon"] },
    { name: "Valkiria (1 taza)", description: "Un método versátil que ofrece una taza al gusto de cada quien.", price: 15, categoryName: "Métodos de café", stationName: B, course: "DRINK", preparationTimeEstimateMin: 8 },
    { name: "AeroPress (1 taza)", description: "(2005) Un método ligero que brinda una taza limpia y brillante.", price: 15, categoryName: "Métodos de café", stationName: B, course: "DRINK", preparationTimeEstimateMin: 8 },
    { name: "Origami (1 taza)", description: "(2019) 20 canales en zigzag como los pliegues del origami: una taza limpia, suave y dulce.", price: 15, categoryName: "Métodos de café", stationName: B, course: "DRINK", preparationTimeEstimateMin: 8 },

    // ---- Tés e infusiones ----
    { name: "Té chai", price: 14, categoryName: "Tés e infusiones", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Té matcha", price: 13, categoryName: "Tés e infusiones", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Infusión frutos very berry", price: 14, categoryName: "Tés e infusiones", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Infusión frutos amarillos", price: 14, categoryName: "Tés e infusiones", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Fantasía", description: "Té rojo, manzanilla, saúco, piel de limón y gin.", price: 15, categoryName: "Tés e infusiones", stationName: B, course: "DRINK", preparationTimeEstimateMin: 6, isAdult: true },
    { name: "Ensoñación", description: "Té negro, anís, jengibre, pieles de naranja y ron.", price: 15, categoryName: "Tés e infusiones", stationName: B, course: "DRINK", preparationTimeEstimateMin: 6, isAdult: true },

    // ---- Chocolates y más ----
    { name: "Chocolate", price: 13, categoryName: "Chocolates y más", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Chocolate con masmelos", price: 14.5, categoryName: "Chocolates y más", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Chocolate Conejo Blanco", description: "Especial 100% cacao, con licor amaretto.", price: 15.4, categoryName: "Chocolates y más", stationName: B, course: "DRINK", preparationTimeEstimateMin: 6, isAdult: true },
    { name: "Maicena tradicional", price: 11.8, categoryName: "Chocolates y más", stationName: B, course: "DRINK", preparationTimeEstimateMin: 6 },
    { name: "Maicena con Milo", price: 14.5, categoryName: "Chocolates y más", stationName: B, course: "DRINK", preparationTimeEstimateMin: 6 },
    { name: "Maicena especiada", description: "Cardamomo, nuez y cúrcuma.", price: 14.5, categoryName: "Chocolates y más", stationName: B, course: "DRINK", preparationTimeEstimateMin: 6 },
    { name: "Milo caliente", price: 12, categoryName: "Chocolates y más", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4, modifierGroupKeys: ["tamano-milo"] },
    { name: "Punsch (vino caliente)", description: "Pieles cítricas, hinojo, anís, clavos, canela y ron de marrasquino.", price: 24, categoryName: "Chocolates y más", stationName: K, course: "DRINK", preparationTimeEstimateMin: 7, isAdult: true },

    // ---- Cafés fríos y coldbrew ----
    { name: "Americano frío", price: 9.8, categoryName: "Cafés fríos y coldbrew", stationName: B, course: "DRINK", preparationTimeEstimateMin: 3 },
    { name: "Latte frío", price: 14.8, categoryName: "Cafés fríos y coldbrew", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Limonada de café", price: 16, categoryName: "Cafés fríos y coldbrew", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Granizado de café", price: 16, categoryName: "Cafés fríos y coldbrew", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Nevado de Fuego", price: 17.6, categoryName: "Cafés fríos y coldbrew", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Affogato amaretto", price: 15.8, categoryName: "Cafés fríos y coldbrew", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4, isAdult: true },
    { name: "Coldbrew", price: 11.5, categoryName: "Cafés fríos y coldbrew", stationName: B, course: "DRINK", preparationTimeEstimateMin: 2 },
    { name: "Coldbrew soda toronja", price: 18.5, categoryName: "Cafés fríos y coldbrew", stationName: B, course: "DRINK", preparationTimeEstimateMin: 3 },
    { name: "Coldbrew lavanda", price: 18.5, categoryName: "Cafés fríos y coldbrew", stationName: B, course: "DRINK", preparationTimeEstimateMin: 3 },
    { name: "Coldbrew tonic", price: 18.5, categoryName: "Cafés fríos y coldbrew", stationName: B, course: "DRINK", preparationTimeEstimateMin: 3 },
    { name: "Coldbrew limoncello", price: 19.5, categoryName: "Cafés fríos y coldbrew", stationName: B, course: "DRINK", preparationTimeEstimateMin: 3, isAdult: true },

    // ---- Limonadas e ice tea ----
    { name: "Limonada natural", price: 12.8, categoryName: "Limonadas e ice tea", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Limonada de cereza", price: 15.8, categoryName: "Limonadas e ice tea", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Limonada de coco", price: 17.8, categoryName: "Limonadas e ice tea", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Limonada de fresa y hierbabuena", price: 15.8, categoryName: "Limonadas e ice tea", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Limonada de lychee", price: 15.8, categoryName: "Limonadas e ice tea", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Matcha latte frío", price: 15.8, categoryName: "Limonadas e ice tea", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Ice tea chai", price: 16.8, categoryName: "Limonadas e ice tea", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Matcha fresa y chantilly", price: 16.8, categoryName: "Limonadas e ice tea", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },

    // ---- Batidos y malteadas ----
    { name: "Batido banano, fresa y avena", price: 16.5, categoryName: "Batidos y malteadas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Batido piña, té matcha y jengibre", price: 16.5, categoryName: "Batidos y malteadas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Batido maracuyá, mango, cúrcuma y yogurt griego", price: 16.5, categoryName: "Batidos y malteadas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Malteada de café", price: 18.5, categoryName: "Batidos y malteadas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Malteada de chocolate", price: 18.5, categoryName: "Batidos y malteadas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Malteada de cereza", price: 18.5, categoryName: "Batidos y malteadas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Malteada de vainilla", price: 18.5, categoryName: "Batidos y malteadas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Malteada maracuyá y pimienta", price: 19.3, categoryName: "Batidos y malteadas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Malteada chocolate y bayas", price: 19.3, categoryName: "Batidos y malteadas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Malteada Alicia", price: 19.3, categoryName: "Batidos y malteadas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5, isAdult: true },
    { name: "Malteada café especial", price: 21.5, categoryName: "Batidos y malteadas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 5, isAdult: true },
    { name: "Malteada Jägermeister", price: 29.5, categoryName: "Batidos y malteadas", stationName: K, course: "DRINK", preparationTimeEstimateMin: 5, isAdult: true },
    { name: "Milo frío", price: 15, categoryName: "Batidos y malteadas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4, modifierGroupKeys: ["adicion-helado"] },

    // ---- Sodas ----
    { name: "Soda Bretaña", price: 10, categoryName: "Sodas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 2 },
    { name: "Soda Bretaña michelada", price: 12, categoryName: "Sodas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 3 },
    { name: "Soda de frutos rojos", price: 16.3, categoryName: "Sodas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Soda de frutos amarillos", price: 16.3, categoryName: "Sodas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Soda de lychee", price: 17, categoryName: "Sodas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 4 },
    { name: "Soda Hatsu", price: 10, categoryName: "Sodas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 2, modifierGroupKeys: ["sabor-hatsu"] },
    { name: "Soda Juniper", price: 15, categoryName: "Sodas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 2, modifierGroupKeys: ["sabor-juniper"] },
    { name: "Agua Hatsu carbonatada", price: 7.5, categoryName: "Sodas", stationName: B, course: "DRINK", preparationTimeEstimateMin: 1 },

    // ---- Cócteles ----
    { name: "New York Sour", price: 32, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 6, isAdult: true },
    { name: "Manhattan", price: 32, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 6, isAdult: true },
    { name: "Penicillin", description: "Whisky, limón y miel de jengibre.", price: 32, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 6, modifierGroupKeys: ["whisky-penicillin"], isAdult: true },
    { name: "Boulevardier", description: "Whisky bourbon, vermouth rosso y campari.", price: 32, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 6, isAdult: true },
    { name: "Pisco Sour", description: "Pisco quebranta, limón, jarabe simple y angostura.", price: 32, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 6, isAdult: true },
    { name: "Mojito", description: "Ron Bacardí blanco, hierbabuena, limón, jarabe simple y soda Bretaña.", price: 32, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 6, modifierGroupKeys: ["sabor-mojito"], isAdult: true },
    { name: "Mojito Jägermeister", price: 34, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 6, isAdult: true },
    { name: "Margarita", description: "Tequila Puerta Negra, limón y triple sec, con crusta de flor de jamaica.", price: 32, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 6, isAdult: true },
    { name: "Margarita Mezcal Ojo de Tigre", price: 42, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 6, isAdult: true },
    { name: "Paloma", price: 32, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 6, isAdult: true },
    { name: "Paloma Mezcal Ojo de Tigre", price: 42, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 6, isAdult: true },
    { name: "Negroni", description: "Gin, campari y vermut rosso.", price: 32, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 5, modifierGroupKeys: ["gin-selva"], isAdult: true },
    { name: "Martini (Dirty)", description: "Gin y vermut extra dry.", price: 32, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 5, modifierGroupKeys: ["gin-selva"], isAdult: true },
    { name: "Gin and Tonic", description: "Gin y agua tónica Juniper.", price: 32, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 4, modifierGroupKeys: ["gin-tonic"], isAdult: true },
    { name: "Moscow Mule", price: 32, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 5, isAdult: true },
    { name: "Cosmopolitan", price: 32, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 5, isAdult: true },
    { name: "Caipiriña", price: 32, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 5, isAdult: true },
    { name: "Aperol Spritz", price: 35, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 4, isAdult: true },
    { name: "Mai Tai", price: 32, categoryName: "Cócteles", stationName: K, course: "DRINK", preparationTimeEstimateMin: 6, isAdult: true },

    // ---- Mocktails (sin alcohol) ----
    { name: "Rosemary", description: "Jengibre, óleo de naranja, romero y soda de toronja Juniper.", price: 17, categoryName: "Mocktails", stationName: K, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Limoncino", description: "Tamarindo, limón y soda de limón hierbabuena Hatsu.", price: 17, categoryName: "Mocktails", stationName: K, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Mariposa Azul", description: "Lavanda, flor de clitoria, jugo de arándanos, limón y tónica elderflower Juniper.", price: 17, categoryName: "Mocktails", stationName: K, course: "DRINK", preparationTimeEstimateMin: 5 },
    { name: "Camellia", description: "Té rojo, jarabe de toronja y soda de rosas Juniper.", price: 17, categoryName: "Mocktails", stationName: K, course: "DRINK", preparationTimeEstimateMin: 5 },

    // ---- Cervezas ----
    { name: "Sol", description: "México.", price: 10.5, categoryName: "Cervezas", stationName: K, course: "DRINK", preparationTimeEstimateMin: 1, isAdult: true },
    { name: "Sol michelada", price: 12.8, categoryName: "Cervezas", stationName: K, course: "DRINK", preparationTimeEstimateMin: 3, isAdult: true },
    { name: "Heineken", description: "Países Bajos.", price: 10.5, categoryName: "Cervezas", stationName: K, course: "DRINK", preparationTimeEstimateMin: 1, isAdult: true },
    { name: "Heineken michelada", price: 12.8, categoryName: "Cervezas", stationName: K, course: "DRINK", preparationTimeEstimateMin: 3, isAdult: true },
    { name: "Monte Largo Café", description: "Artesanal.", price: 15, categoryName: "Cervezas", stationName: K, course: "DRINK", preparationTimeEstimateMin: 1, isAdult: true },
    { name: "Monte Largo Guayaba", description: "Artesanal.", price: 15, categoryName: "Cervezas", stationName: K, course: "DRINK", preparationTimeEstimateMin: 1, isAdult: true },
    { name: "Tres Cordilleras Rosada", description: "Artesanal.", price: 15, categoryName: "Cervezas", stationName: K, course: "DRINK", preparationTimeEstimateMin: 1, isAdult: true },
    { name: "Tres Cordilleras Negra", description: "Artesanal.", price: 15, categoryName: "Cervezas", stationName: K, course: "DRINK", preparationTimeEstimateMin: 1, isAdult: true },

    // ---- Shots ----
    { name: "Shot whisky Monkey Shoulder", price: 14, categoryName: "Shots", stationName: K, course: "DRINK", preparationTimeEstimateMin: 1, isAdult: true },
    { name: "Shot tequila Puerta Negra", price: 12, categoryName: "Shots", stationName: K, course: "DRINK", preparationTimeEstimateMin: 1, isAdult: true },
    { name: "Shot ron añejo Bacardí", price: 12, categoryName: "Shots", stationName: K, course: "DRINK", preparationTimeEstimateMin: 1, isAdult: true },
    { name: "Shot vodka Wyborowa", price: 12, categoryName: "Shots", stationName: K, course: "DRINK", preparationTimeEstimateMin: 1, isAdult: true },
    { name: "Shot Jägermeister", price: 14, categoryName: "Shots", stationName: K, course: "DRINK", preparationTimeEstimateMin: 1, isAdult: true },
    { name: "Shot absenta Fleur de Lis", price: 14, categoryName: "Shots", stationName: K, course: "DRINK", preparationTimeEstimateMin: 1, isAdult: true },
    { name: "Shot cachaza", price: 11, categoryName: "Shots", stationName: K, course: "DRINK", preparationTimeEstimateMin: 1, isAdult: true },
    { name: "Shot pisco", price: 12, categoryName: "Shots", stationName: K, course: "DRINK", preparationTimeEstimateMin: 1, isAdult: true },
  ],
};
