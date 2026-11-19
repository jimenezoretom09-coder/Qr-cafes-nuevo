import { useState } from "react";

/**
 * "¿Como estuvo todo?" despues de pagar. La calificacion le llega al dueño, sea buena o mala.
 * La invitacion a dejar reseña en Google se le muestra a TODOS por igual, despues de calificar:
 * las politicas de Google prohiben pedir reseñas solo a quien quedo contento.
 */
export default function VisitFeedback({
  googleReviewUrl,
  alreadyRated,
  onSend,
}: {
  googleReviewUrl: string | null;
  alreadyRated: boolean;
  onSend: (rating: number, comment: string) => Promise<void>;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(alreadyRated);
  const [sending, setSending] = useState(false);

  if (sent) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <p className="font-display text-lg font-bold text-epi-ink">¡Gracias por contarnos!</p>
        <p className="mt-1 text-sm text-epi-ink-variant">Tu opinión le llega directo al equipo.</p>
        {googleReviewUrl && (
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-lg bg-epi-ink px-5 py-3 text-sm font-semibold text-white"
          >
            ⭐ Dejar una reseña en Google
          </a>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-epi-outline-variant/50 bg-epi-surface p-4 text-center">
      <p className="font-display text-lg font-bold text-epi-ink">¿Cómo estuvo todo?</p>
      <div className="mt-2 flex justify-center gap-1" role="radiogroup" aria-label="Calificación">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            aria-label={`${n} de 5`}
            className={`text-4xl transition active:scale-90 ${n <= rating ? "text-epi-gold" : "text-epi-outline-variant"}`}
          >
            ★
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={rating <= 3 ? "¿Qué podemos mejorar?" : "¿Algo que quieras contarnos? (opcional)"}
            className="mt-3 w-full rounded-lg border border-epi-outline-variant px-3 py-2 text-sm"
          />
          <button
            disabled={sending}
            onClick={async () => {
              setSending(true);
              try {
                await onSend(rating, comment.trim());
                setSent(true);
              } finally {
                setSending(false);
              }
            }}
            className="mt-2 w-full rounded-lg bg-epi-ink py-3 text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </>
      )}
    </section>
  );
}
