import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();
const prisma = new PrismaClient();

// Payment phone number - can be set via environment variable or use default
const PAYMENT_PHONE = process.env.PAYMENT_PHONE || "+222 45 25 25 25";

// Get payment phone number
router.get("/phone", (req, res) => {
  res.json({
    success: true,
    data: {
      phone: PAYMENT_PHONE,
    },
  });
});

// Submit payment with screenshot
router.post(
  "/submit",
  authenticate,
  authorize("CLIENT"),
  upload.single("screenshot"),
  async (req, res, next) => {
    try {
      const { bookingId, amount, currency = "MRU" } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            req.t("payment.screenshot_required") ||
            "Payment screenshot is required",
        });
      }

      // First, get the client profile to verify ownership
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: req.user.id },
      });

      if (!clientProfile) {
        return res.status(404).json({
          success: false,
          message:
            req.t("payment.client_profile_not_found") ||
            "Client profile not found",
        });
      }

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          client: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          doctor: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: req.t("payment.booking_not_found") || "Booking not found",
        });
      }

      // Verify the booking belongs to the authenticated client
      if (booking.clientId !== clientProfile.id) {
        return res.status(403).json({
          success: false,
          message:
            req.t("payment.unauthorized") ||
            "You don't have permission to pay for this booking",
        });
      }

      if (booking.status !== "CONFIRMED") {
        return res.status(400).json({
          success: false,
          message:
            req.t("payment.booking_not_confirmed") ||
            "Booking must be confirmed before payment",
        });
      }

      // Check if payment already exists
      const existingPayment = await prisma.payment.findUnique({
        where: { bookingId },
      });

      let payment;
      if (existingPayment) {
        // Update existing payment with new screenshot
        payment = await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            screenshot: `/uploads/${req.file.filename}`,
            amount: parseFloat(amount),
            currency,
            status: "PENDING", // Reset to pending for admin verification
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new payment record
        payment = await prisma.payment.create({
          data: {
            bookingId,
            clientId: booking.clientId,
            amount: parseFloat(amount),
            currency,
            paymentMethod: "manual",
            screenshot: `/uploads/${req.file.filename}`,
            status: "PENDING",
          },
        });
      }

      res.json({
        success: true,
        message:
          req.t("payment.submitted_successfully") ||
          "Payment submitted successfully. We will verify your payment and update the booking status.",
        data: {
          payment,
        },
      });
    } catch (error) {
      console.error("Payment submission error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        bookingId: req.body.bookingId,
        amount: req.body.amount,
        currency: req.body.currency,
      });
      next(error);
    }
  }
);

// Confirm payment (webhook handler)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res
        .status(400)
        .send(`Webhook signature verification failed. ${err.message}`);
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;

      const payment = await prisma.payment.update({
        where: { paymentIntentId: paymentIntent.id },
        data: {
          status: "COMPLETED",
          transactionId: paymentIntent.id,
        },
      });

      // Update booking status if needed
      if (payment.bookingId) {
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: { status: "CONFIRMED" },
        });
      }
    }

    res.json({ received: true });
  }
);

// Get pending payments for doctor (to verify)
router.get(
  "/pending",
  authenticate,
  authorize("DOCTOR"),
  async (req, res, next) => {
    try {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id },
      });

      if (!doctorProfile) {
        return res.status(404).json({
          success: false,
          message:
            req.t("payment.doctor_profile_not_found") ||
            "Doctor profile not found",
        });
      }

      // Get all bookings for this doctor with pending payments
      const bookings = await prisma.booking.findMany({
        where: {
          doctorId: doctorProfile.id,
          payment: {
            status: "PENDING",
          },
        },
        include: {
          payment: true,
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
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        data: {
          payments: bookings.map((booking) => ({
            ...booking.payment,
            booking: {
              id: booking.id,
              sessionDate: booking.sessionDate,
              sessionDuration: booking.sessionDuration,
              client: booking.client,
            },
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Verify payment (Doctor only)
router.patch(
  "/:id/verify",
  authenticate,
  authorize("DOCTOR"),
  async (req, res, next) => {
    try {
      const paymentId = req.params.id;

      // Get doctor profile
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id },
      });

      if (!doctorProfile) {
        return res.status(404).json({
          success: false,
          message:
            req.t("payment.doctor_profile_not_found") ||
            "Doctor profile not found",
        });
      }

      // Get payment with booking
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          booking: true,
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: req.t("payment.not_found") || "Payment not found",
        });
      }

      // Verify the booking belongs to this doctor
      if (payment.booking.doctorId !== doctorProfile.id) {
        return res.status(403).json({
          success: false,
          message:
            req.t("payment.unauthorized") ||
            "You don't have permission to verify this payment",
        });
      }

      // Verify payment is pending
      if (payment.status !== "PENDING") {
        return res.status(400).json({
          success: false,
          message:
            req.t("payment.already_processed") ||
            "Payment has already been processed",
        });
      }

      // Update payment status to COMPLETED
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "COMPLETED",
        },
        include: {
          booking: {
            include: {
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
          },
        },
      });

      res.json({
        success: true,
        message:
          req.t("payment.verified_successfully") ||
          "Payment verified successfully",
        data: {
          payment: updatedPayment,
        },
      });
    } catch (error) {
      console.error("Payment verification error:", error);
      next(error);
    }
  }
);

// Get payment history
router.get("/history", authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    let payments;
    let total;

    if (req.user.role === "CLIENT") {
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: req.user.id },
      });

      if (!clientProfile) {
        return res.json({
          success: true,
          data: { payments: [], pagination: {} },
        });
      }

      payments = await prisma.payment.findMany({
        where: { clientId: clientProfile.id },
        include: {
          booking: {
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
            },
          },
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      });

      total = await prisma.payment.count({
        where: { clientId: clientProfile.id },
      });
    } else if (req.user.role === "DOCTOR") {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id },
      });

      if (!doctorProfile) {
        return res.json({
          success: true,
          data: { payments: [], pagination: {} },
        });
      }

      // Get all bookings for this doctor
      const bookings = await prisma.booking.findMany({
        where: { doctorId: doctorProfile.id },
        select: { id: true },
      });

      const bookingIds = bookings.map((b) => b.id);

      payments = await prisma.payment.findMany({
        where: {
          bookingId: { in: bookingIds },
        },
        include: {
          booking: {
            include: {
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
          },
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      });

      total = await prisma.payment.count({
        where: {
          bookingId: { in: bookingIds },
        },
      });
    } else {
      return res.status(403).json({
        success: false,
        message: req.t("payment.unauthorized") || "Unauthorized",
      });
    }

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
