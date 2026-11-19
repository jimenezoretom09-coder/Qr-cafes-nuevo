/**
 * Datos de ESTE café — este es el único archivo que cambia de un
 * cliente a otro (el logo y los colores se ponen después desde Admin > Asistente y marca). Para instalar un restaurante nuevo: crea un repositorio a
 * partir de la plantilla en GitHub, reemplaza el contenido de este archivo
 * con la información real del nuevo cliente (nombre, mesas, personal, menú),
 * y corre "npm run db:seed --workspace=server" contra su base de datos.
 *
 * "roleName" en el personal debe ser uno de: ADMIN | MANAGER | WAITER | KITCHEN | BAR | CASHIER
 * "mealPeriod" en categorías debe ser uno de: BREAKFAST | LUNCH | ALL
 * "course" en platos debe ser uno de: STARTER | MAIN | DESSERT | DRINK
 * Los precios se escriben en miles de pesos (25 = $25.000), igual que en el panel admin.
 *
 * ---------------------------------------------------------------------------
 * INSTALACIÓN EN BLANCO (este archivo): no trae mesas, menú ni extras de
 * ejemplo — todo eso se carga después desde el panel Admin (Mesas, Menú,
 * Extras), que ya tiene formularios para crear cada cosa sin tocar código.
 * Solo se deja un usuario Administrador para poder entrar la primera vez.
 * ---------------------------------------------------------------------------
 */

export interface RestaurantConfig {
  businessName: string;
  /** Datos del perfil (opcionales): se usan solo al crear el perfil la primera vez. */
  profile?: {
    description?: string;
    tone?: string;
    address?: string;
    phone?: string;
    policies?: string;
    logoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
    tipSuggestionPercent?: number;
    googleReviewUrl?: string;
  };
  stations: { name: string; color: string }[];
  tables: { label: string; capacity: number; zone: string }[];
  staff: { name: string; roleName: string; pin: string }[];
  modifierGroups: {
    key: string; // identificador interno para referenciarlo desde menuItems, no se muestra al cliente
    name: string;
    minSelect: number;
    maxSelect: number;
    modifiers: { name: string; priceDelta: number }[];
  }[];
  categories: { name: string; sortOrder: number; mealPeriod: "BREAKFAST" | "LUNCH" | "ALL"; stationName: string }[];
  menuItems: {
    name: string;
    description?: string;
    price: number;
    categoryName: string;
    stationName: string;
    course: "STARTER" | "MAIN" | "DESSERT" | "DRINK";
    preparationTimeEstimateMin?: number;
    modifierGroupKeys?: string[];
    /** Contiene alcohol: sello +18 y confirmacion de edad. */
    isAdult?: boolean;
  }[];
}

export const restaurantConfig: RestaurantConfig = {
  businessName: "Mi Café",

  stations: [],

  tables: [],

  staff: [
    // Cambiar este PIN desde Admin > Usuarios apenas se entre por primera vez.
    { name: "Administrador", roleName: "ADMIN", pin: "1234" },
  ],

  modifierGroups: [],

  categories: [],

  menuItems: [],
};
