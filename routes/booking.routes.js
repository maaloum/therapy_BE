import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate, bookingSchema } from "../utils/validation.js";

const router = express.Router();
const prisma = new PrismaClient();

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log(
    `[BOOKING ROUTER] ${req.method} ${req.originalUrl} - Path: ${req.path}`
  );
  next();
});

// Test route to verify booking routes are loaded
router.get("/test", (req, res) => {
  res.json({ success: true, message: "Booking routes are working!" });
});

// Create booking (Client only)
router.post(
  "/",
  (req, res, next) => {
    console.log(
      "POST /api/bookings hit - Method:",
      req.method,
      "Path:",
      req.path
    );
    next();
  },
  authenticate,
  authorize("CLIENT"),
  validate(bookingSchema),
  async (req, res, next) => {
    try {
      console.log("Creating booking with data:", req.body);
      const { doctorId, sessionDate, sessionDuration, sessionType, notes } =
        req.body;

      // Check if doctor exists
      const doctor = await prisma.doctorProfile.findUnique({
        where: { userId: doctorId },
        include: { user: true },
      });

      if (!doctor) {
        console.log("Doctor not found for userId:", doctorId);
        return res.status(404).json({
          success: false,
          message: req.t("booking.doctor_not_found") || "Doctor not found",
        });
      }

      // Log doctor info for debugging
      console.log("Doctor found:", {
        id: doctor.id,
        userId: doctor.userId,
        isVerified: doctor.isVerified,
        hasUser: !!doctor.user,
      });

      // Get or create client profile
      let clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: req.user.id },
      });

      if (!clientProfile) {
        console.log("Creating client profile for user:", req.user.id);
        // Create client profile if it doesn't exist
        clientProfile = await prisma.clientProfile.create({
          data: {
            userId: req.user.id,
          },
        });
      }

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          clientId: clientProfile.id,
          doctorId: doctor.id,
          sessionDate: new Date(sessionDate),
          sessionDuration: parseInt(sessionDuration) || 60,
          sessionType: sessionType || "video",
          notes: notes || null,
          status: "PENDING",
        },
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          client: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: req.t("booking.created") || "Booking created successfully",
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get user's bookings
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let bookings;

    if (req.user.role === "CLIENT") {
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: req.user.id },
      });

      if (!clientProfile) {
        return res.json({
          success: true,
          data: { bookings: [], pagination: {} },
        });
      }

      const where = { clientId: clientProfile.id };
      if (status) where.status = status;

      bookings = await prisma.booking.findMany({
        where,
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          payment: true,
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { sessionDate: "desc" },
      });

      const total = await prisma.booking.count({ where });

      res.json({
        success: true,
        data: {
          bookings,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } else if (req.user.role === "DOCTOR") {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id },
      });

      if (!doctorProfile) {
        return res.json({
          success: true,
          data: { bookings: [], pagination: {} },
        });
      }

      const where = { doctorId: doctorProfile.id };
      if (status) where.status = status;

      bookings = await prisma.booking.findMany({
        where,
        include: {
          client: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          payment: true,
          sessionNote: true,
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { sessionDate: "desc" },
      });

      const total = await prisma.booking.count({ where });

      res.json({
        success: true,
        data: {
          bookings,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

// Get single booking
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        doctor: {
          select: {
            id: true,
            userId: true,
            hourlyRate: true,
            specialization: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        client: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        payment: true,
        sessionNote: req.user.role === "DOCTOR" ? true : false,
      },
    });

    // Fetch review separately if it exists (to avoid Prisma client errors before migration)
    let review = null;
    try {
      review = await prisma.review.findUnique({
        where: { bookingId: req.params.id },
      });
    } catch (error) {
      // Review relation might not exist yet, ignore error
      console.log("Review relation not available yet");
    }

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: req.t("booking.not_found") || "Booking not found",
      });
    }

    // Check authorization
    if (req.user.role === "CLIENT") {
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (booking.clientId !== clientProfile?.id) {
        return res.status(403).json({
          success: false,
          message: req.t("booking.unauthorized") || "Unauthorized",
        });
      }
    } else if (req.user.role === "DOCTOR") {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (booking.doctorId !== doctorProfile?.id) {
        return res.status(403).json({
          success: false,
          message: req.t("booking.unauthorized") || "Unauthorized",
        });
      }
    }

    // Attach review to booking object
    if (review) {
      booking.review = review;
    }

    res.json({
      success: true,
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
});

// Update booking status (Doctor can confirm/decline, Client can cancel)
router.patch("/:id/status", authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: req.t("booking.not_found") || "Booking not found",
      });
    }

    // Authorization checks
    if (req.user.role === "DOCTOR") {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (booking.doctorId !== doctorProfile?.id) {
        return res.status(403).json({
          success: false,
          message: req.t("booking.unauthorized") || "Unauthorized",
        });
      }
      if (!["CONFIRMED", "DECLINED", "COMPLETED"].includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            req.t("booking.invalid_status") || "Invalid status for doctor",
        });
      }

      // Check if payment is completed before allowing COMPLETED status
      if (status === "COMPLETED") {
        const payment = await prisma.payment.findUnique({
          where: { bookingId: booking.id },
        });

        if (!payment) {
          return res.status(400).json({
            success: false,
            message:
              req.t("booking.payment_required") ||
              "Payment must be completed before marking session as completed",
          });
        }

        if (payment.status !== "COMPLETED") {
          return res.status(400).json({
            success: false,
            message:
              req.t("booking.payment_not_completed") ||
              "Payment must be completed before marking session as completed. Current payment status: " +
                payment.status,
          });
        }
      }
    } else if (req.user.role === "CLIENT") {
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (booking.clientId !== clientProfile?.id) {
        return res.status(403).json({
          success: false,
          message: req.t("booking.unauthorized") || "Unauthorized",
        });
      }
      if (status !== "CANCELLED") {
        return res.status(400).json({
          success: false,
          message:
            req.t("booking.invalid_status") || "Invalid status for client",
        });
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        doctor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        client: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      message: req.t("booking.status_updated") || "Booking status updated",
      data: { booking: updatedBooking },
    });
  } catch (error) {
    next(error);
  }
});

// Reschedule booking (Client only)
router.patch(
  "/:id/reschedule",
  authenticate,
  authorize("CLIENT"),
  async (req, res, next) => {
    try {
      const { sessionDate } = req.body;
      const booking = await prisma.booking.findUnique({
        where: { id: req.params.id },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: req.t("booking.not_found") || "Booking not found",
        });
      }

      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: req.user.id },
      });

      if (booking.clientId !== clientProfile?.id) {
        return res.status(403).json({
          success: false,
          message: req.t("booking.unauthorized") || "Unauthorized",
        });
      }

      if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
        return res.status(400).json({
          success: false,
          message:
            req.t("booking.cannot_reschedule") ||
            "Cannot reschedule this booking",
        });
      }

      const updatedBooking = await prisma.booking.update({
        where: { id: req.params.id },
        data: {
          sessionDate: new Date(sessionDate),
          status: "PENDING", // Reset to pending for doctor confirmation
        },
      });

      res.json({
        success: true,
        message:
          req.t("booking.rescheduled") || "Booking rescheduled successfully",
        data: { booking: updatedBooking },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Debug: Catch-all route to see what requests are coming in
router.use((req, res, next) => {
  console.log(
    `[BOOKING ROUTES] ${req.method} ${req.path} - Not matched by any route`
  );
  next();
});

export default router;
