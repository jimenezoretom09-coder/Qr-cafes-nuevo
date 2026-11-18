import { PrismaClient } from "@prisma/client";
import webpush from "web-push";

/**
 * Notificaciones push: le suenan al personal aunque tenga el celular bloqueado o la app
 * cerrada (nuevo pedido a cocina, plato listo al mesero, "me llaman de la mesa 4").
 *
 * Las llaves VAPID identifican a ESTA instalacion ante los servicios de push de Google/Apple.
 * Se pueden poner en VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY; si no estan, se generan solas la
 * primera vez y se guardan en la base (AppSetting), porque si cambian, todos los celulares que
 * ya activaron los avisos dejan de recibirlos hasta que los vuelvan a activar.
 */

export interface PushPayload {
  title: string;
  body: string;
  /** Pantalla que se abre al tocar la notificacion. */
  url: string;
  /** Notificaciones con el mismo tag se reemplazan en vez de amontonarse. */
  tag?: string;
}

let configured: Promise<string> | null = null;

async function loadOrCreateKeys(prisma: PrismaClient): Promise<{ publicKey: string; privateKey: string }> {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const stored = await prisma.appSetting.findUnique({ where: { key: "vapid" } });
  if (stored) return JSON.parse(stored.value);

  const keys = webpush.generateVAPIDKeys();
  // upsert por si dos procesos arrancan a la vez: gana el primero y el otro lee el mismo par.
  const saved = await prisma.appSetting.upsert({
    where: { key: "vapid" },
    update: {},
    create: { key: "vapid", value: JSON.stringify(keys) },
  });
  return JSON.parse(saved.value);
}

/** Devuelve la llave publica (la que necesita el navegador para suscribirse). */
export function ensurePushConfigured(prisma: PrismaClient): Promise<string> {
  if (!configured) {
    configured = loadOrCreateKeys(prisma).then((keys) => {
      const contact = process.env.VAPID_CONTACT ?? "mailto:soporte@example.com";
      webpush.setVapidDetails(contact, keys.publicKey, keys.privateKey);
      return keys.publicKey;
    });
    configured.catch(() => {
      configured = null;
    });
  }
  return configured;
}

export async function saveSubscription(
  prisma: PrismaClient,
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } }
) {
  // Un celular = un endpoint. Si en esa tablet de cocina entra otra persona, los avisos pasan
  // a ser de quien entro de ultimo.
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
}

export async function removeSubscription(prisma: PrismaClient, endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

/**
 * Envia a todos los celulares del personal con alguno de estos roles. Nunca lanza error: un
 * aviso que no sale no puede tumbar el pedido que lo provoco.
 */
export async function sendPushToRoles(prisma: PrismaClient, roleNames: string[], payload: PushPayload) {
  try {
    await ensurePushConfigured(prisma);
    const users = await prisma.user.findMany({
      where: { active: true, role: { name: { in: roleNames } } },
      select: { id: true },
    });
    if (users.length === 0) return;

    const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: users.map((u) => u.id) } } });
    const body = JSON.stringify(payload);

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            // urgency high: Android entrega de inmediato aunque el celular este en ahorro de bateria.
            { TTL: 600, urgency: "high" }
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          // 404/410: el celular desinstalo la app o revoco el permiso. Se borra para no insistir.
          if (status === 404 || status === 410) {
            await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
          }
        }
      })
    );
  } catch (err) {
    console.error("No se pudo enviar la notificacion push", err);
  }
}
