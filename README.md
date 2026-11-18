# RMS Cafés

Sistema de pedidos por QR para cafés, todo desde el celular: el cliente escanea el QR de su
mesa, ve la carta con video 360° de cada plato, pide, y sigue su pedido en vivo. Cocina, barra,
meseros, caja y dueño trabajan cada uno desde su propio celular o tablet, con su rol.

Cada café es una **instalación independiente** (su repositorio, su base de datos, su servidor),
con su propio logo, colores y menú. Ver [docs/manual-instalacion-cliente.md](docs/manual-instalacion-cliente.md).

## Qué hace

**El cliente (sin descargar nada, desde el QR):**
- Escribe su nombre al entrar (opcional), así cada plato queda a nombre de quien lo pidió.
- Carta con fotos y **video 360° en bucle** de cada plato (toca el video para verlo en grande).
- Pide desde su celular; varias personas de la misma mesa pueden pedir cada una desde el suyo.
- **Seguimiento en vivo** de cada pedido: Enviado → Recibido por cocina → Confirmado →
  Preparando → Listo → En camino a tu mesa → Entregado. Ve su puesto en la fila y el tiempo
  estimado, y el celular vibra cuando está listo. Si algo se agota, lo ve marcado "Agotado".
- Botones **Llamar al mesero** y **Pedir la cuenta** (toda la mesa o solo lo suyo, y cómo va a pagar).
- Ve su cuenta y la de toda la mesa, dividida por persona.
- **Asistente (chatbot)**: recomienda, responde dudas, **toma el pedido** ("quiero dos capuchinos
  grandes con leche de avena"), cuenta cómo va el pedido y llama al mesero. Lo que pide el chat
  queda en "Mi pedido" para que el cliente lo confirme con un toque.

**El personal (cada uno con su PIN y su rol):**
- **Cocina / Barra**: tablero de **comandas por mesa**, en orden de llegada. Todo lo que pide una
  mesa mientras cocina no lo ha confirmado entra en la misma comanda, así la mesa se sirve
  completa y no a pedazos. Botones Confirmar → Empezar → Todo listo, **Agotado** por plato (lo
  quita del pedido y lo apaga en la carta) y pestaña **Agotados** para apagar/encender platos.
- **Mesero**: mapa de mesas, toma de pedidos y el botón 🔔 con los llamados de las mesas y los
  pedidos listos para llevar (Llevando → Entregado).
- **Caja**: cobro, división de cuenta, turnos de caja, y aviso de las mesas que piden la cuenta.
- **Dueño (Administrador)**: acceso a todo — menú, mesas, **códigos QR para imprimir con su
  logo**, marca (logo y colores), personal, reportes, asistente.
- **Notificaciones push** en el celular del personal **aunque esté bloqueado**: nuevo pedido
  (cocina, barra, dueño), pedido listo (mesero), mesa llama / pide la cuenta (mesero, caja, dueño).

## Desarrollo

```bash
npm install
cp server/.env.example server/.env   # o crea server/.env con DATABASE_URL y JWT_SECRET
npm run db:migrate
npm run db:seed:demo                 # carga el "Café Demo" (o npm run db:seed para uno en blanco)
npm run dev                          # API en :4000, web en :5173
```

PINs del demo: dueño 1234 · mesero 1111 · cocina 2222 · barra 3333 · caja 4444.
Los QR de las mesas están en Admin → Códigos QR (botón "Probar" abre la carta de esa mesa).

Estructura: `server/` (Fastify + Prisma + Socket.IO + web-push), `web/` (React + Vite +
Tailwind, PWA), `shared/` (tipos y reglas comunes).

## Documentos

- [Manual de instalación por café](docs/manual-instalacion-cliente.md)
- [Modelo de negocio y precios sugeridos](docs/modelo-de-negocio.md)
- [Historial de funciones](docs/roadmap.md)
