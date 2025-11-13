import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "../utils/jwt.js";
import {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../utils/validation.js";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../utils/email.js";

const router = express.Router();
const prisma = new PrismaClient();

// Register
router.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const {
      email,
      phone,
      password,
      firstName,
      lastName,
      preferredLanguage,
      role,
    } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [email ? { email } : {}, phone ? { phone } : {}],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: req.t("auth.user_exists") || "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create user (unverified by default)
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        firstName,
        lastName,
        preferredLanguage: preferredLanguage || "FRENCH",
        role: role || "CLIENT",
        isVerified: false,
        verificationToken,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        preferredLanguage: true,
        createdAt: true,
      },
    });

    // Create profile based on role
    if (role === "CLIENT") {
      await prisma.clientProfile.create({
        data: { userId: user.id },
      });
    } else if (role === "DOCTOR") {
      await prisma.doctorProfile.create({
        data: {
          userId: user.id,
          hourlyRate: 0,
          availableHours: {},
          languages: [preferredLanguage || "FRENCH"],
        },
      });
    }

    // Send verification email if email is provided
    if (email) {
      try {
        await sendVerificationEmail(email, verificationToken, firstName);
      } catch (error) {
        console.error("Failed to send verification email:", error);
        // Continue even if email fails - user can request resend
      }
    }

    res.status(201).json({
      success: true,
      message:
        req.t("auth.register_success_verify") || email
          ? "Registration successful! Please check your email to verify your account."
          : "Registration successful! Please verify your account.",
      data: {
        user: {
          ...user,
          isVerified: false,
        },
        requiresVerification: !!email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [email ? { email } : {}, phone ? { phone } : {}],
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: req.t("auth.invalid_credentials") || "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: req.t("auth.invalid_credentials") || "Invalid credentials",
      });
    }

    // Check if email is verified (only if user has email)
    if (user.email && !user.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          req.t("auth.email_not_verified") ||
          "Please verify your email address before logging in. Check your inbox for the verification link.",
        requiresVerification: true,
      });
    }

    const token = generateToken(user.id);

    // Get profile photo based on role
    let photo = null;
    if (user.role === "CLIENT") {
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: user.id },
        select: { photo: true },
      });
      photo = clientProfile?.photo || null;
    } else if (user.role === "DOCTOR") {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: user.id },
        select: { photo: true },
      });
      photo = doctorProfile?.photo || null;
    }

    res.json({
      success: true,
      message: req.t("auth.login_success") || "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
          photo,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        preferredLanguage: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: req.t("auth.user_not_found") || "User not found",
      });
    }

    // Get profile photo based on role
    let photo = null;
    if (user.role === "CLIENT") {
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: user.id },
        select: { photo: true },
      });
      photo = clientProfile?.photo || null;
    } else if (user.role === "DOCTOR") {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: user.id },
        select: { photo: true },
      });
      photo = doctorProfile?.photo || null;
    }

    res.json({
      success: true,
      data: { user: { ...user, photo } },
    });
  } catch (error) {
    next(error);
  }
});

// Update language preference
router.patch("/language", authenticate, async (req, res, next) => {
  try {
    const { preferredLanguage } = req.body;

    if (!["ARABIC", "FRENCH"].includes(preferredLanguage)) {
      return res.status(400).json({
        success: false,
        message: req.t("validation.invalid_language") || "Invalid language",
      });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { preferredLanguage },
      select: {
        id: true,
        preferredLanguage: true,
      },
    });

    res.json({
      success: true,
      message: req.t("auth.language_updated") || "Language preference updated",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

// Forgot Password
router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const { email, phone } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          OR: [email ? { email } : {}, phone ? { phone } : {}],
        },
      });

      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          success: true,
          message:
            req.t("auth.forgot_password_sent") ||
            "If an account exists, a password reset link has been sent.",
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetTokenExpiry,
        },
      });

      // In production, send email/SMS with reset link
      // For now, we'll return the token (in production, this should be sent via email/SMS)
      const resetUrl = `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/reset-password?token=${resetToken}`;

      // Send password reset email if email is provided
      if (user.email) {
        try {
          await sendPasswordResetEmail(user.email, resetUrl, user.firstName);
        } catch (error) {
          console.error("Failed to send password reset email:", error);
          // Continue even if email fails
        }
      }

      res.json({
        success: true,
        message:
          req.t("auth.forgot_password_sent") ||
          "If an account exists, a password reset link has been sent.",
        // Remove this in production - only for development
        ...(process.env.NODE_ENV === "development" && { resetToken, resetUrl }),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reset Password
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { token, password } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message:
            req.t("auth.invalid_or_expired_token") ||
            "Invalid or expired reset token",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });

      res.json({
        success: true,
        message:
          req.t("auth.password_reset_success") ||
          "Password has been reset successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

// Verify Email
router.get("/verify-email", async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message:
          req.t("auth.verification_token_required") ||
          "Verification token is required",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          req.t("auth.invalid_verification_token") ||
          "Invalid verification token",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: req.t("auth.already_verified") || "Email is already verified",
      });
    }

    // Verify the user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
      },
    });

    res.json({
      success: true,
      message:
        req.t("auth.email_verified") ||
        "Email verified successfully! You can now log in.",
    });
  } catch (error) {
    next(error);
  }
});

// Resend Verification Email
router.post("/resend-verification", async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: req.t("auth.email_required") || "Email is required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists for security
      return res.json({
        success: true,
        message:
          req.t("auth.verification_email_sent") ||
          "If an account exists with this email, a verification link has been sent.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: req.t("auth.already_verified") || "Email is already verified",
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(
        user.email,
        verificationToken,
        user.firstName
      );
    } catch (error) {
      console.error("Failed to send verification email:", error);
      return res.status(500).json({
        success: false,
        message:
          req.t("auth.failed_to_send_email") ||
          "Failed to send verification email",
      });
    }

    res.json({
      success: true,
      message:
        req.t("auth.verification_email_sent") ||
        "Verification email sent. Please check your inbox.",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
