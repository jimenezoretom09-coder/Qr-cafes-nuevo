# Roadmap

## Fase 1 — MVP (implementada)
Auth por PIN + roles/permisos configurables, mapa de mesas, toma de pedidos con modificadores/notas,
enrutamiento automático por estación de cocina, KDS en tiempo real (Socket.IO) con temporizadores y
alertas de demora, disponibilidad de platos en tiempo real, gestión básica de menú y usuarios, auditoría
de acciones.

## Fase 2 — Pagos, caja y aprobaciones (implementada)
- Apertura/cierre de turno de caja (`CashSession`) con una sola caja abierta a la vez y cuadre automático
  (esperado = apertura + ventas en efectivo, vs. contado).
- Cobro (`Payment`) con efectivo/tarjeta/digital, impuesto y cargo por servicio calculados automáticamente
  (tasas fijas en `shared/src/billing.ts`), propina con sugerencias rápidas (10/15/20%) o monto libre.
- División de cuenta: completa, por plato (bloqueada si la cuenta tiene descuento) o en partes iguales
  (con redondeo absorbido por la última parte).
- Recibo digital imprimible (`window.print()`) una vez saldada la cuenta; la mesa se libera automáticamente.
- Historial de transacciones por turno con trazabilidad (cajero, mesa, hora, método).
- Flujo de aprobaciones (`ApprovalRequest`) para descuentos y anulación de platos/cuenta completa: si quien
  solicita ya tiene el permiso de aprobación (gerente/admin) se aplica al instante; si no, queda pendiente
  y notifica en tiempo real a Gerente/Admin, quienes aprueban o rechazan desde "Aprobaciones" en el panel.
- El mesero puede pedir la cuenta (marca la mesa como "cuenta pedida") y solicitar la anulación de un plato
  no preparado/en preparación directamente desde su panel de pedidos.

**Pendiente dentro de Fase 2** (fuera de alcance por tiempo, no bloquea el flujo anterior):
- `InventoryItem` / `RecipeItem`: descuento automático de stock al preparar un plato, alertas de stock bajo.
- Reembolsos (`REFUND`) solo revierten el registro contable (marca `refunded`) — no hay integración con
  una pasarela de pago real para devolver dinero automáticamente.

## Fase 3 — Reportes, fidelización y acceso multi-dispositivo (implementada parcialmente)
- **Acceso multi-dispositivo en la red local**: el servidor Vite ahora escucha en todas las interfaces
  (`host: true`), el frontend resuelve la API/WebSocket contra el mismo host desde el que se abrió la
  página (no un `localhost` fijo — así un tablet/celular en el mismo Wi-Fi que abre `http://<IP-LAN>:5173`
  habla con el backend correcto) y el CORS refleja el origen de la petición (sigue exigiendo JWT en cada
  ruta). Se agregó un manifest PWA (`web/public/manifest.webmanifest`) para poder "instalar" la app en la
  pantalla de inicio de un tablet/celular como si fuera una app nativa.
- **Reportes** (`/api/reports/sales`, `/api/reports/kitchen`, panel "Reportes" en Admin): ventas por hora,
  por categoría (bruto) y por mesero para un rango de fechas; tiempo promedio de preparación y conteo de
  platos demorados por estación de cocina. Basado en órdenes `CLOSED` y en los timestamps ya capturados en
  Fase 1/2 — sin nuevas tablas de agregación.
- **Fidelización de clientes** (`Customer`, permiso `customers:manage`): el cajero busca/registra un
  cliente por teléfono al cobrar (panel "Cliente" en la pantalla de pago); al cerrarse la cuenta se
  acreditan puntos (1 por unidad de moneda del total, sin propina) y se actualiza el conteo de visitas y
  el gasto total. Sin redención de puntos todavía (solo acumulación) — ver pendientes abajo. Panel "Clientes"
  en Admin para ver/registrar clientes.

**Pendiente dentro de Fase 3:**
- Redención de puntos como descuento en el pago.
- Reportes de rendimiento de personal más allá de ventas (tiempos de servicio, cancelaciones por mesero).
- `InventoryItem` / `RecipeItem`: descuento automático de stock al preparar un plato (heredado de Fase 2).
- Migración de SQLite a PostgreSQL (cambiar `provider` en `schema.prisma` + `DATABASE_URL`) — necesaria
  solo si se pasa a múltiples sucursales o mayor concurrencia; no requerida para una sola sede en LAN.
- Entidad `Branch` para múltiples sedes y despliegue en internet (hosting/dominio) — no solicitados: el
  negocio opera en una sola sede y el acceso multi-dispositivo ya está resuelto dentro de la red local.
