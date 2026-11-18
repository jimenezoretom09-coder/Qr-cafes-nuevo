import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { Server as SocketIOServer, Socket } from "socket.io";
import { rooms, type AuthUserDTO } from "@rms/shared";

declare module "fastify" {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

// Must be registered after the auth plugin (needs fastify.jwt to verify handshake tokens).
export default fp(async (fastify: FastifyInstance) => {
  // Same reasoning as the HTTP CORS setup in index.ts: reflect the origin so devices reaching
  // this over the LAN (not just localhost) can open the WebSocket. The handshake below still
  // requires a valid JWT before anything is trusted.
  const io = new SocketIOServer(fastify.server, {
    cors: { origin: process.env.CORS_ORIGIN ?? true },
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) throw new Error("missing token");
      const payload = (await fastify.jwt.verify(token)) as AuthUserDTO;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as AuthUserDTO;
    socket.join(rooms.waiter(user.id));
    socket.join(rooms.role(user.roleName));
    socket.join(rooms.global());

    socket.on("subscribe:station", (stationId: string) => {
      socket.join(rooms.station(stationId));
    });
  });

  fastify.decorate("io", io);
  fastify.addHook("onClose", async (instance) => {
    instance.io.close();
  });
});
