import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();
const prisma = new PrismaClient();

// Get user profile
router.get("/profile", authenticate, async (req, res, next) => {
  try {
    let profile;

    if (req.user.role === "CLIENT") {
      profile = await prisma.clientProfile.findUnique({
        where: { userId: req.user.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              preferredLanguage: true,
              createdAt: true,
            },
          },
        },
      });
    } else if (req.user.role === "DOCTOR") {
      profile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              preferredLanguage: true,
              createdAt: true,
            },
          },
        },
      });
    }

    res.json({
      success: true,
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.patch(
  "/profile",
  authenticate,
  upload.single("photo"),
  async (req, res, next) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        address,
        city,
        country,
      } = req.body;

      // Prepare user update data - only update if value is provided and not empty
      const userUpdateData = {};
      if (firstName && typeof firstName === "string" && firstName.trim()) {
        userUpdateData.firstName = firstName.trim();
      }
      if (lastName && typeof lastName === "string" && lastName.trim()) {
        userUpdateData.lastName = lastName.trim();
      }

      // Check if email is being updated and if it's already taken
      // Only update if email is provided, not empty, and different from current
      if (
        email !== undefined &&
        email !== null &&
        typeof email === "string" &&
        email.trim() !== "" &&
        email.trim() !== (req.user.email || "")
      ) {
        const existingUser = await prisma.user.findUnique({
          where: { email: email.trim() },
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message:
              req.t("user.email_already_exists") || "Email already exists",
          });
        }
        userUpdateData.email = email.trim();
      }

      // Check if phone is being updated and if it's already taken
      // Only update if phone is provided, not empty, and different from current
      if (
        phone !== undefined &&
        phone !== null &&
        typeof phone === "string" &&
        phone.trim() !== "" &&
        phone.trim() !== (req.user.phone || "")
      ) {
        const existingUser = await prisma.user.findUnique({
          where: { phone: phone.trim() },
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message:
              req.t("user.phone_already_exists") ||
              "Phone number already exists",
          });
        }
        userUpdateData.phone = phone.trim();
      }

      // Update user
      if (Object.keys(userUpdateData).length > 0) {
        await prisma.user.update({
          where: { id: req.user.id },
          data: userUpdateData,
        });
      }

      // Update profile based on role
      if (req.user.role === "CLIENT") {
        let clientProfile = await prisma.clientProfile.findUnique({
          where: { userId: req.user.id },
        });

        // Create client profile if it doesn't exist
        if (!clientProfile) {
          clientProfile = await prisma.clientProfile.create({
            data: { userId: req.user.id },
          });
        }

        const profileUpdateData = {};
        // Only update dateOfBirth if provided and not empty
        if (
          dateOfBirth &&
          typeof dateOfBirth === "string" &&
          dateOfBirth.trim() !== ""
        ) {
          profileUpdateData.dateOfBirth = new Date(dateOfBirth);
        }
        // Only update address fields if provided (empty string means clear the field)
        if (address !== undefined) {
          profileUpdateData.address =
            address && typeof address === "string" && address.trim() !== ""
              ? address.trim()
              : null;
        }
        if (city !== undefined) {
          profileUpdateData.city =
            city && typeof city === "string" && city.trim() !== ""
              ? city.trim()
              : null;
        }
        if (country !== undefined) {
          profileUpdateData.country =
            country && typeof country === "string" && country.trim() !== ""
              ? country.trim()
              : null;
        }
        // Only update photo if a new file is uploaded
        if (req.file) profileUpdateData.photo = `/uploads/${req.file.filename}`;

        if (Object.keys(profileUpdateData).length > 0) {
          await prisma.clientProfile.update({
            where: { userId: req.user.id },
            data: profileUpdateData,
          });
        }
      }

      res.json({
        success: true,
        message:
          req.t("user.profile_updated") || "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        body: req.body,
        user: req.user?.id,
      });
      next(error);
    }
  }
);

export default router;
