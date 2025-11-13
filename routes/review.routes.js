import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate, reviewSchema } from "../utils/validation.js";

const router = express.Router();
const prisma = new PrismaClient();

// Create review (Client only, after completed session)
router.post(
  "/",
  authenticate,
  authorize("CLIENT"),
  validate(reviewSchema),
  async (req, res, next) => {
    try {
      const { bookingId, rating, comment } = req.body;

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          client: {
            include: {
              user: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: req.t("review.booking_not_found") || "Booking not found",
        });
      }

      // Check if the booking belongs to the authenticated client
      if (booking.client.user.id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message:
            req.t("review.unauthorized") ||
            "You are not authorized to review this booking",
        });
      }

      if (booking.status !== "COMPLETED") {
        return res.status(400).json({
          success: false,
          message:
            req.t("review.session_not_completed") ||
            "Session must be completed before reviewing",
        });
      }

      // Check if review already exists
      const existingReview = await prisma.review.findUnique({
        where: { bookingId },
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message:
            req.t("review.already_exists") ||
            "Review already exists for this booking",
        });
      }

      const review = await prisma.review.create({
        data: {
          bookingId,
          clientId: req.user.id, // Use the authenticated user's ID
          doctorId: booking.doctorId,
          rating: parseInt(rating),
          comment: comment || null,
        },
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
      });

      // Update doctor's rating
      const doctorReviews = await prisma.review.findMany({
        where: { doctorId: booking.doctorId },
      });

      const avgRating =
        doctorReviews.reduce((sum, r) => sum + r.rating, 0) /
        doctorReviews.length;

      await prisma.doctorProfile.update({
        where: { id: booking.doctorId },
        data: {
          rating: avgRating,
          totalReviews: doctorReviews.length,
        },
      });

      res.status(201).json({
        success: true,
        message: req.t("review.created") || "Review created successfully",
        data: { review },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get reviews for a doctor
router.get("/doctor/:doctorId", async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const reviews = await prisma.review.findMany({
      where: { doctorId: req.params.doctorId },
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
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.review.count({
      where: { doctorId: req.params.doctorId },
    });

    res.json({
      success: true,
      data: {
        reviews,
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
