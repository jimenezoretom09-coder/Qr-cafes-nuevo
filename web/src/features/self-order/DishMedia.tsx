import { useEffect, useRef, useState } from "react";

/**
 * Foto o video de un plato en la carta del comensal.
 *
 * El video solo se descarga y se reproduce cuando la tarjeta esta a la vista: una carta con
 * 20 platos filmados no puede bajar 20 videos de golpe en el celular del comensal (datos,
 * bateria y tirones al hacer scroll). Fuera de pantalla se pausa.
 *
 * Mientras carga se ve un brillo suave en vez de un rectangulo negro, y si el archivo falla
 * cae a la foto — o desaparece — en lugar de dejar un hueco roto en la carta.
 */
export default function DishMedia({
  imageUrl,
  videoUrl,
  alt,
}: {
  imageUrl: string | null;
  videoUrl: string | null;
  alt: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const showVideo = Boolean(videoUrl) && !videoFailed;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // rootMargin: empieza a cargar un poco antes de entrar en pantalla, para que al llegar
    // el video ya este listo y no se vea el salto.
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "200px 0px", threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideo) return;

    if (isVisible) {
      // play() rechaza si el navegador bloquea el autoplay; sin catch queda un error suelto
      // en consola y, en algunos navegadores, el video se queda en negro.
      video.play().catch(() => setVideoFailed(true));
    } else {
      video.pause();
    }
  }, [isVisible, showVideo]);

  if (!imageUrl && !videoUrl) return null;
  if (videoFailed && !imageUrl) return null;

  return (
    <div ref={containerRef} className="relative aspect-[4/3] w-full overflow-hidden bg-epi-surface-low">
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-epi-surface-low via-epi-surface-container to-epi-surface-low" />
      )}

      {showVideo ? (
        <video
          ref={videoRef}
          src={isVisible ? videoUrl! : undefined}
          poster={imageUrl ?? undefined}
          muted
          loop
          playsInline
          preload="none"
          onLoadedData={() => setIsLoaded(true)}
          onError={() => setVideoFailed(true)}
          className={`h-full w-full object-cover transition-opacity duration-500 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : (
        <img
          src={imageUrl ?? undefined}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-500 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}
