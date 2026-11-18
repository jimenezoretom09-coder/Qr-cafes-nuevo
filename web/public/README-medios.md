# Fotos y videos de los platos

Los medios de la carta viven aquí y se sirven desde el mismo sitio, sin cuentas ni servicios
extra. Netlify los entrega por su CDN.

- `videos/` → se usan como `/videos/<nombre>.mp4`
- `fotos/` → se usan como `/fotos/<nombre>.jpg`

## Cómo agregar el video de un plato

1. Recibir el video crudo (como salga del celular, no importa el peso ni la orientación).
2. Procesarlo:

   ```
   cd server
   node scripts/preparar-video-plato.mjs "C:\ruta\al\video.mp4" medio-ajiaco
   ```

   El script comprime el video (sin audio, máximo 10 segundos, 720 px de ancho) y saca la
   foto de portada del propio video. El script imprime las dos rutas al terminar.

3. En **Admin → Menú**, en el plato correspondiente, pegar:
   - Link del video: `/videos/medio-ajiaco.mp4`
   - Link de la foto: `/fotos/medio-ajiaco.jpg`

4. Desplegar (`git add`, `git commit`, `git push`): los archivos viajan con el sitio.

## Por qué la foto de portada importa

Es lo que ve el comensal mientras el video carga. Sin ella queda un rectángulo vacío en la
carta. El script siempre la genera, así que no hay que tomarla aparte.

## Cuándo dejaría de servir este enfoque

Netlify da 100 GB de tráfico al mes en el plan gratis. Con clips de ~500 KB eso alcanza de
sobra para un restaurante. Si algún día son muchos videos o mucho tráfico, el siguiente paso
es Cloudflare R2 (10 GB gratis, sin cobro por descarga) y solo cambiarían las rutas por
enlaces `https://`, que la app ya acepta.
