import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();
const prisma = new PrismaClient();

// Get total unread messages count
router.get("/unread-count", authenticate, async (req, res, next) => {
  try {
    const unreadCount = await prisma.message.count({
      where: {
        receiverId: req.user.id,
        isRead: false,
      },
    });

    res.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    next(error);
  }
});

// Get messages for a conversation
router.get("/conversation/:userId", authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.user.id, receiverId: userId },
          { senderId: userId, receiverId: req.user.id },
        ],
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
      orderBy: { createdAt: "desc" },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: userId,
        receiverId: req.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to show oldest first
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get all conversations
router.get("/conversations", authenticate, async (req, res, next) => {
  try {
    let confirmedUserIds = [];

    // For doctors, get all clients with CONFIRMED bookings (even if no messages exist)
    if (req.user.role === "DOCTOR") {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id },
      });

      if (doctorProfile) {
        const confirmedBookings = await prisma.booking.findMany({
          where: {
            doctorId: doctorProfile.id,
            status: "CONFIRMED",
          },
          select: {
            clientId: true,
            client: {
              select: {
                userId: true,
              },
            },
          },
          distinct: ["clientId"],
        });

        confirmedUserIds = confirmedBookings.map((b) => b.client.userId);
      }
    }

    // For clients, get all doctors with bookings (PENDING, CONFIRMED, COMPLETED) - any reservation
    if (req.user.role === "CLIENT") {
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: req.user.id },
      });

      if (clientProfile) {
        const clientBookings = await prisma.booking.findMany({
          where: {
            clientId: clientProfile.id,
            status: {
              in: ["PENDING", "CONFIRMED", "COMPLETED"], // Include all active booking statuses
            },
          },
          select: {
            doctorId: true,
            doctor: {
              select: {
                userId: true,
              },
            },
          },
          distinct: ["doctorId"],
        });

        confirmedUserIds = clientBookings.map((b) => b.doctor.userId);
      }
    }

    // Get distinct conversations from existing messages
    const sentMessages = await prisma.message.findMany({
      where: { senderId: req.user.id },
      select: { receiverId: true },
      distinct: ["receiverId"],
    });

    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: req.user.id },
      select: { senderId: true },
      distinct: ["senderId"],
    });

    let userIds = [
      ...new Set([
        ...sentMessages.map((m) => m.receiverId),
        ...receivedMessages.map((m) => m.senderId),
      ]),
    ];

    // Include ALL confirmed users (clients for doctors, doctors for clients) even if no messages exist
    if (confirmedUserIds.length > 0) {
      // Merge existing conversation user IDs with confirmed user IDs
      userIds = [...new Set([...userIds, ...confirmedUserIds])];
    }

    const conversations = await Promise.all(
      userIds.map(async (userId) => {
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: req.user.id, receiverId: userId },
              { senderId: userId, receiverId: req.user.id },
            ],
          },
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        const unreadCount = await prisma.message.count({
          where: {
            senderId: userId,
            receiverId: req.user.id,
            isRead: false,
          },
        });

        const otherUser = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            email: true,
            phone: true,
          },
        });

        // Get the latest booking info for both doctors and clients
        let latestBooking = null;
        if (req.user.role === "DOCTOR") {
          const doctorProfile = await prisma.doctorProfile.findUnique({
            where: { userId: req.user.id },
          });
          if (doctorProfile) {
            const clientProfile = await prisma.clientProfile.findUnique({
              where: { userId: userId },
            });
            if (clientProfile) {
              latestBooking = await prisma.booking.findFirst({
                where: {
                  doctorId: doctorProfile.id,
                  clientId: clientProfile.id,
                  status: {
                    in: ["PENDING", "CONFIRMED", "COMPLETED"],
                  },
                },
                orderBy: { sessionDate: "desc" },
                select: {
                  id: true,
                  sessionDate: true,
                  sessionType: true,
                  status: true,
                },
              });
            }
          }
        } else if (req.user.role === "CLIENT") {
          const clientProfile = await prisma.clientProfile.findUnique({
            where: { userId: req.user.id },
          });
          if (clientProfile) {
            const doctorProfile = await prisma.doctorProfile.findUnique({
              where: { userId: userId },
            });
            if (doctorProfile) {
              latestBooking = await prisma.booking.findFirst({
                where: {
                  doctorId: doctorProfile.id,
                  clientId: clientProfile.id,
                  status: {
                    in: ["PENDING", "CONFIRMED", "COMPLETED"],
                  },
                },
                orderBy: { sessionDate: "desc" },
                select: {
                  id: true,
                  sessionDate: true,
                  sessionType: true,
                  status: true,
                },
              });
            }
          }
        }

        return {
          user: otherUser,
          lastMessage,
          unreadCount,
          latestBooking,
        };
      })
    );

    // Sort conversations: conversations without messages first, then by last message time (most recent first)
    conversations.sort((a, b) => {
      // Both have messages - sort by most recent
      if (a.lastMessage && b.lastMessage) {
        return (
          new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
        );
      }
      // Only a has no message - put it first
      if (!a.lastMessage && b.lastMessage) return -1;
      // Only b has no message - put it first
      if (a.lastMessage && !b.lastMessage) return 1;
      // Neither has messages - keep original order
      return 0;
    });

    res.json({
      success: true,
      data: { conversations },
    });
  } catch (error) {
    next(error);
  }
});

// Send message (handled via Socket.io, but keeping REST endpoint for fallback)
router.post("/", authenticate, async (req, res, next) => {
  try {
    const { receiverId, content, type = "TEXT", bookingId } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({
        success: false,
        message: req.t("message.missing_fields") || "Missing required fields",
      });
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.user.id,
        receiverId,
        content,
        type,
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

    res.status(201).json({
      success: true,
      message: req.t("message.sent") || "Message sent",
      data: { message },
    });
  } catch (error) {
    next(error);
  }
});

// Mark messages as read
router.patch("/read/:userId", authenticate, async (req, res, next) => {
  try {
    await prisma.message.updateMany({
      where: {
        senderId: req.params.userId,
        receiverId: req.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: req.t("message.marked_read") || "Messages marked as read",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
