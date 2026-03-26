import { Server } from "socket.io";
import { socketAuthMiddleware } from "./middleware/socket-auth.middleware.js";
import { registerChatHandlers } from "./handlers/chat.handlers.js";
import { userRoomName } from "./rooms/room-names.js";

export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*"
    }
  });

  const presenceState = new Map();

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const userId = socket.data.user.id;
    const currentConnections = (presenceState.get(userId) || 0) + 1;
    presenceState.set(userId, currentConnections);

    socket.join(userRoomName(userId));
    io.emit("presence:online", { userId });

    registerChatHandlers(io, socket);

    socket.on("disconnect", () => {
      const remainingConnections = Math.max((presenceState.get(userId) || 1) - 1, 0);

      if (remainingConnections === 0) {
        presenceState.delete(userId);
        io.emit("presence:offline", { userId });
        return;
      }

      presenceState.set(userId, remainingConnections);
    });
  });

  return io;
};
