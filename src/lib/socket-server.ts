import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { Message } from "@/types";

interface Room {
  messages: Message[];
  participants: Map<string, string>; // socketId -> name
}

const rooms = new Map<string, Room>();

export function initSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
    path: "/api/socket",
  });

  io.on("connection", (socket) => {
    let currentRoom: string | null = null;
    let currentName: string | null = null;

    socket.on("join_room", ({ roomId, name }: { roomId: string; name: string }) => {
      currentRoom = roomId;
      currentName = name;
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, { messages: [], participants: new Map() });
      }

      const room = rooms.get(roomId)!;
      room.participants.set(socket.id, name);

      io.to(roomId).emit("user_joined", {
        name,
        participants: Array.from(room.participants.values()),
      });

      // Send existing messages to the new participant
      socket.emit("message_history", room.messages);
    });

    socket.on(
      "send_message",
      async ({ roomId, message }: { roomId: string; message: Message }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        room.messages.push(message);
        io.to(roomId).emit("new_message", message);
      }
    );

    socket.on("disconnect", () => {
      if (currentRoom && currentName) {
        const room = rooms.get(currentRoom);
        if (room) {
          room.participants.delete(socket.id);
          io.to(currentRoom).emit("user_left", {
            name: currentName,
            participants: Array.from(room.participants.values()),
          });
        }
      }
    });
  });

  return io;
}
