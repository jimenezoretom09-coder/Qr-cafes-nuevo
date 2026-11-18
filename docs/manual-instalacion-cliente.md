# Manual de instalación — restaurante nuevo

Proceso para instalar el sistema en un restaurante nuevo. Cada restaurante es una instalación
**independiente**: su propio repositorio, su propia base de datos (Neon), su propio servidor
(Render) y su propio sitio (Netlify). Si algo falla en un cliente, no afecta a los demás.

Los pasos marcados **(Jimena)** son los únicos que necesitan que ella esté presente: crear o
verificar cuentas, y comprar el dominio. Todo lo demás lo hace Claude.

Primer cliente instalado con este manual: **La Azotea** (octubre 2026).

---

## 1. Información del restaurante (Jimena, con el dueño)

Hay dos formas de instalar:

- **En blanco** (lo normal para vender): solo hace falta el **nombre del restaurante**. Mesas,
  menú, estaciones, extras y personal los carga el dueño desde el panel Admin, que tiene
  formularios para todo. Al entrar la primera vez, el Resumen le muestra los "Primeros pasos".
- **Precargado**: además del nombre, reunir menú con precios y categorías, mesas, extras, horario,
  personal con roles y PIN. Claude lo traduce a `restaurant.config.ts`.

Si el cliente va a tener **dominio propio** (ej. `laazotea.com`), Jimena lo compra en cualquier
registrador (GoDaddy, Namecheap, Hostinger...). Se conecta en el paso 6.

## 2. Crear el repositorio del cliente (Claude)

```bash
gh repo create jimenezoretom09-coder/rms-<cliente> \
  --template jimenezoretom09-coder/rms-restaurante --private
git clone https://github.com/jimenezoretom09-coder/rms-<cliente>.git "<carpeta>"
cd "<carpeta>"
git config user.email ""        # misma convención que el repo de la plantilla
git remote add upstream https://github.com/jimenezoretom09-coder/rms-restaurante.git
git fetch upstream
```

**Paso obligatorio — enlazar el historial con la plantilla.** Un repo creado con "Use this
template" arranca con un historial propio, sin relación con la plantilla, y `git merge
upstream/master` se niega a mezclar ("refusing to merge unrelated histories"). Sin este paso, el
cliente nunca podría recibir mejoras. Se hace **una sola vez**, con el commit de la plantilla del
que se creó el repo (el `master` de la plantilla en ese momento):

```bash
git diff --stat <commit-plantilla> HEAD       # debe salir vacío: confirma que es el mismo punto
git merge -s ours --allow-unrelated-histories <commit-plantilla> \
  -m "Enlazar historial con la plantilla rms-restaurante"
git merge-base HEAD upstream/master            # debe devolver <commit-plantilla>
```

Después, reemplazar `server/prisma/restaurant.config.ts`:
- **En blanco**: copiar el de `rms-la-azotea` y cambiar solo `businessName`.
- **Precargado**: llenarlo con los datos del cliente.

Commit y push. Comprobar que la única diferencia con la plantilla es ese archivo:
`git diff --stat upstream/master HEAD`.

## 3. Probar la instalación antes de crear cuentas (Claude)

Con una base Postgres temporal (en este equipo no hay Postgres ni Docker; se usa el paquete
`embedded-postgres` en la carpeta de pruebas, nunca la base de un cliente real):

```bash
npx prisma generate --schema=server/prisma/schema.prisma   # en un clon nuevo, antes de compilar
npm run build --workspace=shared && npm run build --workspace=server
DATABASE_URL=<base-temporal> npx prisma migrate deploy   # (desde server/)
DATABASE_URL=<base-temporal> npm run db:seed
```

Verificar con `npx prisma migrate diff --from-url <base-temporal> --to-schema-datamodel
prisma/schema.prisma` que la base migrada es idéntica al esquema (debe decir "empty
migration"), y recorrer el sistema: entrar con el PIN de Administrador, crear estación,
categoría, plato y mesa, pedir por QR, verlo en Cocina y Meseros, abrir Caja.

## 4. Cuentas del cliente (Jimena hace los clics, Claude guía)

- **Neon** → proyecto nuevo con el nombre del cliente. Copiar la *connection string* (pooled).
- **Render** → Web Service nuevo conectado al repo `rms-<cliente>`.
  - Build command:
    `npm install && npm run build --workspace=shared && npx prisma generate --schema=server/prisma/schema.prisma && npx prisma migrate deploy --schema=server/prisma/schema.prisma && npm run build --workspace=server`
    (incluye `migrate deploy`: así, cuando la plantilla agregue columnas, cada cliente las
    recibe solo al desplegar, sin que haya que acordarse de migrar uno por uno)
  - Start command: `npm run start --workspace=server`
  - Health check path: `/api/health`
  - **Plan**: para un cliente que paga, **Starter (~7 USD/mes) desde el primer día**. El plan
    gratis apaga el servidor tras 15 minutos sin uso — el primer comensal espera ~50 segundos
    viendo "Cargando" — y las 750 horas gratis del mes se **comparten entre todos los servicios
    de la cuenta**: con dos o más restaurantes en plan gratis, se acaban a mitad de mes y se caen
    todos, incluido el de Jimena.
- **Netlify** → sitio nuevo conectado al mismo repo. Usa `netlify.toml` (no hay que configurar
  build a mano).

## 5. Variables de entorno (Claude)

**Render:**

| Variable | Valor |
|---|---|
| `DATABASE_URL` | connection string de Neon del cliente |
| `JWT_SECRET` | clave larga, nueva y **única por cliente** (`openssl rand -hex 32`). Obligatoria: en Render el servidor **se niega a arrancar** sin ella |
| `CORS_ORIGIN` | URL pública del sitio del cliente: `https://<dominio>` (o `https://<sitio>.netlify.app` mientras no haya dominio) |
| `LLM_PROVIDER` | `gemini` |
| `GEMINI_API_KEY` | clave de Gemini (la misma de Jimena sirve; si un cliente usa mucho el asistente, darle una propia) |
| `NODE_VERSION` | `20.18.0` |

**Netlify:** `VITE_API_URL` = URL del backend en Render (`https://rms-<cliente>.onrender.com`).
Se lee **al compilar**: si se cambia, hay que volver a desplegar el sitio.

## 6. Dominio propio (Jimena compra, Claude conecta)

1. Netlify → *Domain management* → *Add a domain* → escribir el dominio.
2. Netlify muestra los registros DNS a poner en el registrador donde se compró (normalmente un
   registro `A` para el dominio y un `CNAME` para `www`). Jimena los pega en el panel del
   registrador — o le da acceso a Claude para guiarla pantalla por pantalla.
3. Esperar la propagación (de minutos a unas horas) y el certificado HTTPS, que Netlify emite solo.
4. **Cambiar `CORS_ORIGIN` en Render a `https://<dominio>`** y redesplegar. Si se olvida, el sitio
   carga pero no puede pedir el menú ni nada al servidor.

## 7. Sembrar y verificar en producción (Claude)

```bash
DATABASE_URL=<neon-del-cliente> npm run db:seed --workspace=server
curl https://rms-<cliente>.onrender.com/api/health   # → {"ok":true,"version":"<commit>"}
```

La siembra crea los roles, el usuario Administrador y el perfil con el nombre del restaurante
(es lo que muestra la carta y lo que usa el asistente IA). No pisa un perfil que ya exista.

Prueba de humo en el sitio real: entrar, pedir por QR, ver en Cocina, cobrar en Caja, y luego
borrar ese pedido de prueba.

## 8. Entrega (Jimena)

- Entrar con el PIN del Administrador (`1234` en la instalación en blanco) y **cambiarlo** en
  Usuarios. Crear al personal con sus propios PIN.
- Cuando el dueño ya haya creado sus mesas, generar e imprimir los QR:
  `node scripts/generate-table-qr.mjs https://<dominio>` (desde `server/`).
- Anotar el cliente en `docs/clientes-registro.md` (privado, no se sube a git).
- Empieza el período de prueba de 14 días.

## Llevar mejoras a los clientes instalados

Las mejoras se hacen siempre en la plantilla (`rms-restaurante`). Para pasarlas a un cliente:

```bash
cd "<carpeta-del-cliente>"
git fetch upstream
git merge upstream/master
git diff --stat upstream/master HEAD   # debe mostrar solo restaurant.config.ts
git push                               # Render y Netlify redespliegan solos
curl https://rms-<cliente>.onrender.com/api/health   # confirmar que "version" es el commit nuevo
```

Las migraciones nuevas se aplican solas en el build de Render (paso 4). Si `version` sigue en el
commit anterior varios minutos después, el despliegue falló y Render sigue sirviendo la versión
vieja: revisar los logs del servicio en Render.

## Cuando termina la prueba

- Si sigue: confirmar que está en Render Starter y empezar a cobrar la mensualidad.
- Si no sigue: archivar el repositorio y suspender los servicios (no borrar de inmediato, por si
  retoma).
