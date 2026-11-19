# Probar RMS Cafés en tu computador (sin subir nada a internet)

Todo corre en tu computador. El celular entra por el mismo Wi-Fi. Viene cargado con la carta real
de **El Sombrerero** (152 productos, 12 mesas).

## Una sola vez

1. **Instala Node.js** (versión LTS) desde <https://nodejs.org> si no lo tienes.
   Para saber si ya lo tienes: abre "Símbolo del sistema" y escribe `node -v`.
2. **Descarga el proyecto** desde GitHub: en el repositorio `Qr-cafes-nuevo`, botón verde
   **Code → Download ZIP** (en la rama `claude/blissful-johnson-qwdbyh`), y descomprímelo en una
   carpeta fácil, por ejemplo `Documentos\RMS-Cafes`.

## Cada vez que quieras usarlo

1. Doble clic en **`iniciar-demo.bat`** (en Mac/Linux: `./iniciar-demo.sh`).
   - La primera vez instala todo y prepara la base de datos: tarda unos minutos.
   - Si Windows pregunta si permite que **Node.js** use la red, marca **Redes privadas** y
     acepta. Sin eso el celular no puede entrar.
2. Se abre el navegador solo. La ventana negra muestra:
   - La dirección para entrar, por ejemplo `http://192.168.1.15:4000`.
   - **Un QR de la Mesa 1**: escanéalo con la cámara del celular para pedir como cliente.
3. **No cierres la ventana negra** mientras lo uses. Para terminar: `Ctrl + C` o cerrarla.

## Qué probar

| Quién | Cómo entra | PIN |
|---|---|---|
| Cliente | Escanea el QR de una mesa con el celular | — |
| Dueño | La dirección de la ventana → PIN | 1234 |
| Mesero | Otro celular o pestaña → PIN | 1111 |
| Cocina | Tablet o pestaña → PIN | 2222 |
| Barra (café y cócteles) | → PIN | 3333 |
| Caja | → PIN | 4444 |

Recorrido sugerido:
1. En el celular, escanea la Mesa 1, escribe tu nombre, pide un cóctel (te pedirá confirmar que
   eres mayor de 18) y un postre.
2. En el computador entra como **Cocina** o **Barra**: aparece el pedido de la mesa; tócalo:
   Confirmar → Empezar → Todo listo. Mira en el celular cómo cambia cada paso.
3. Entra como **Mesero**: botón 🔔 abajo a la derecha → "Entregado".
4. En el celular toca **Pedir la cuenta** (con propina voluntaria del 10% o sin ella).
5. Entra como **Caja**, abre el turno y cobra la Mesa 1. En el celular aparece
   "¿Cómo estuvo todo?". Califica y mira la calificación en Dueño → **Opiniones**.
6. Como **Dueño** → **Códigos QR** → diseño "Alicia en el país de las maravillas" →
   Imprimir: salen las 12 tarjetas temáticas con los QR reales de esta demo.

## Bueno saber

- Los QR que imprimas en esta demo solo funcionan mientras tu computador tenga la demo abierta y
  el celular esté en el mismo Wi-Fi. Para el café real, el sistema se publica en internet y los
  QR se imprimen de nuevo.
- Las **notificaciones con el celular bloqueado** necesitan https, así que en la demo por Wi-Fi
  no llegan al celular (sí funcionan en el computador). En la instalación real sí llegan.
- El **asistente (chatbot)** necesita una clave de Gemini; sin ella responde que no está
  disponible, y todo lo demás funciona igual.
- Para empezar de cero (borrar pedidos de prueba): cierra la demo y borra la carpeta
  `.demo-local` dentro del proyecto.
- Para cargar el "Café Demo" genérico en vez de El Sombrerero: borra la carpeta `.demo-local`,
  abre "Símbolo del sistema" en la carpeta del proyecto, escribe `set DEMO_SEED=demo` y luego
  `iniciar-demo.bat`.
