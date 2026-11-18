let audioCtx: AudioContext | null = null;
let armado = false;
const suscriptores = new Set<(listo: boolean) => void>();

function notificar() {
  const listo = audioCtx?.state === "running";
  suscriptores.forEach((fn) => fn(listo));
}

/**
 * El navegador crea el AudioContext en estado "suspended" hasta que la persona toca la
 * pantalla: sin esto, la cocina deja la pantalla abierta toda la mañana y los avisos no suenan
 * nunca aunque el codigo los dispare. Se intenta reanudar en el primer toque o tecla.
 */
export function armarSonido() {
  if (armado) return;
  armado = true;

  const reanudar = () => {
    audioCtx ??= new AudioContext();
    void audioCtx.resume().then(notificar);
  };

  for (const evento of ["pointerdown", "keydown", "touchstart"]) {
    window.addEventListener(evento, reanudar, { once: false, passive: true });
  }
  reanudar();
}

/** true cuando el navegador ya deja sonar los avisos. */
export function sonidoListo() {
  return audioCtx?.state === "running";
}

/** Avisa cuando el sonido queda habilitado, para poder esconder el aviso de "activar sonido". */
export function alCambiarEstadoDelSonido(fn: (listo: boolean) => void) {
  suscriptores.add(fn);
  return () => {
    suscriptores.delete(fn);
  };
}

/** Short synthesized beep — avoids shipping an audio asset for the KDS/waiter alert sounds. */
export function playBeep(frequency = 880, durationMs = 180) {
  audioCtx ??= new AudioContext();

  // Si quedo suspendido (pestaña recien abierta, o el navegador lo pauso al pasar a segundo
  // plano) se reanuda y se suena apenas vuelva: perder el aviso es peor que oirlo tarde.
  if (audioCtx.state !== "running") {
    void audioCtx.resume().then(() => {
      notificar();
      if (audioCtx?.state === "running") emitir(frequency, durationMs);
    });
    return;
  }

  emitir(frequency, durationMs);
}

function emitir(frequency: number, durationMs: number) {
  if (!audioCtx) return;
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);
  oscillator.connect(gain).connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + durationMs / 1000);
}

/** Repite el aviso: para cuando entra un pedido nuevo y la cocina esta lejos de la pantalla. */
export function playAlerta(veces = 3, frequency = 880) {
  for (let i = 0; i < veces; i++) {
    setTimeout(() => playBeep(frequency, 200), i * 320);
  }
}
