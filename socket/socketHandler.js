import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        console.error("Socket authentication failed: No token provided");
        return next(new Error("Authentication error: No token provided"));
      }

      // Verify token using the same JWT verification as middleware
      let decoded;

      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (jwtError) {
        console.error(
          "Socket authentication failed: Invalid token",
          jwtError.message
        );
        return next(new Error("Authentication error: Invalid token"));
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      if (!user) {
        console.error(
          "Socket authentication failed: User not found",
          decoded.userId
        );
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.id}`);

    // Join user's personal room
    socket.join(`user:${socket.user.id}`);

    // Join booking rooms if user has active bookings
    socket.on("join-booking", async (bookingId) => {
      socket.join(`booking:${bookingId}`);
    });

    // Handle sending messages
    socket.on("send-message", async (data) => {
      try {
        const { receiverId, content, type = "TEXT", bookingId } = data;

        // Validate required fields
        if (!receiverId || !content) {
          socket.emit("error", {
            message:
              "Missing required fields: receiverId and content are required",
          });
          return;
        }

        // Validate content is not empty
        if (typeof content !== "string" || content.trim().length === 0) {
          socket.emit("error", {
            message: "Message content cannot be empty",
          });
          return;
        }

        // Save message to database
        const message = await prisma.message.create({
          data: {
            senderId: socket.user.id,
            receiverId,
            content: content.trim(),
            type: type || "TEXT",
            bookingId: bookingId || null,
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            receiver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        // Emit to receiver
        io.to(`user:${receiverId}`).emit("new-message", message);

        // If booking room exists, emit there too
        if (bookingId) {
          io.to(`booking:${bookingId}`).emit("new-message", message);
        }

        // Confirm to sender
        socket.emit("message-sent", message);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", {
          message: "Failed to send message",
          error: error.message,
        });
      }
    });

    // Handle typing indicator
    socket.on("typing", (data) => {
      const { receiverId, bookingId } = data;
      socket.to(`user:${receiverId}`).emit("user-typing", {
        userId: socket.user.id,
        userName: `${socket.user.firstName} ${socket.user.lastName}`,
      });
    });

    socket.on("stop-typing", (data) => {
      const { receiverId } = data;
      socket.to(`user:${receiverId}`).emit("user-stop-typing", {
        userId: socket.user.id,
      });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });
};
