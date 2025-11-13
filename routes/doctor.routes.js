import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import multer from "multer";
import path from "path";

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "doctor-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Get all doctors (public)
router.get("/", async (req, res, next) => {
  try {
    const {
      specialization,
      language,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const where = {
      role: "DOCTOR",
      doctorProfile: {
        isNot: null,
      },
    };

    if (specialization) {
      where.doctorProfile = {
        ...where.doctorProfile,
        specialization: { has: specialization },
      };
    }

    if (language) {
      where.doctorProfile = {
        ...where.doctorProfile,
        languages: { has: language },
      };
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    const doctors = await prisma.user.findMany({
      where,
      include: {
        doctorProfile: {
          include: {
            statistics: true,
          },
        },
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: {
        doctorProfile: {
          rating: "desc",
        },
      },
    });

    const total = await prisma.user.count({ where });

    res.json({
      success: true,
      data: {
        doctors,
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

// Get single doctor (public)
router.get("/:id", async (req, res, next) => {
  try {
    const doctor = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        doctorProfile: {
          include: {
            statistics: true,
            reviews: {
              include: {
                client: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        },
      },
    });

    if (!doctor || doctor.role !== "DOCTOR") {
      return res.status(404).json({
        success: false,
        message: req.t("doctor.not_found") || "Doctor not found",
      });
    }

    res.json({
      success: true,
      data: { doctor },
    });
  } catch (error) {
    next(error);
  }
});

// Create/Update doctor profile
router.put(
  "/profile",
  authenticate,
  authorize("DOCTOR"),
  upload.single("photo"),
  async (req, res, next) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        bio,
        specialization,
        languages,
        hourlyRate,
        availableHours,
        yearsOfExperience,
      } = req.body;

      // Update user information if provided - only update if value is provided and not empty
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

      // Update user if there are changes
      if (Object.keys(userUpdateData).length > 0) {
        await prisma.user.update({
          where: { id: req.user.id },
          data: userUpdateData,
        });
      }

      const updateData = {};
      if (bio !== undefined) updateData.bio = bio;

      // Parse specialization - handle both JSON string and array
      if (specialization !== undefined) {
        try {
          const parsedSpecialization =
            typeof specialization === "string"
              ? JSON.parse(specialization)
              : specialization;
          updateData.specialization = Array.isArray(parsedSpecialization)
            ? parsedSpecialization.filter((s) => s && s.trim())
            : parsedSpecialization
            ? [parsedSpecialization]
            : [];
        } catch (error) {
          // If JSON parsing fails, treat as comma-separated string
          updateData.specialization = specialization
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s);
        }
      }

      // Parse languages - handle both JSON string and array
      // Languages must be valid enum values: ARABIC or FRENCH
      if (languages !== undefined) {
        try {
          const parsedLanguages =
            typeof languages === "string" ? JSON.parse(languages) : languages;
          const validLanguages = ["ARABIC", "FRENCH"];
          const filtered = Array.isArray(parsedLanguages)
            ? parsedLanguages.filter(
                (l) => l && validLanguages.includes(l.toUpperCase())
              )
            : parsedLanguages &&
              validLanguages.includes(parsedLanguages.toUpperCase())
            ? [parsedLanguages.toUpperCase()]
            : [];
          updateData.languages =
            filtered.length > 0
              ? filtered.map((l) => l.toUpperCase())
              : [req.user.preferredLanguage];
        } catch (error) {
          // If JSON parsing fails, check if it's a valid enum value
          const validLanguages = ["ARABIC", "FRENCH"];
          if (languages && validLanguages.includes(languages.toUpperCase())) {
            updateData.languages = [languages.toUpperCase()];
          } else {
            updateData.languages = [req.user.preferredLanguage];
          }
        }
      }

      // hourlyRate is required, so always set it (default to 0 if empty)
      if (hourlyRate !== undefined) {
        if (hourlyRate === "" || hourlyRate === null) {
          updateData.hourlyRate = 0;
        } else {
          const parsedRate = parseFloat(hourlyRate);
          if (!isNaN(parsedRate) && parsedRate >= 0) {
            updateData.hourlyRate = parsedRate;
          }
        }
      }
      // yearsOfExperience is optional, allow clearing it
      // Only include if value is provided (to avoid Prisma errors if client not regenerated)
      if (yearsOfExperience !== undefined && yearsOfExperience !== "") {
        const parsedYears = parseInt(yearsOfExperience);
        if (!isNaN(parsedYears) && parsedYears >= 0) {
          updateData.yearsOfExperience = parsedYears;
        }
      } else if (yearsOfExperience === "") {
        // Only set to null if explicitly cleared (and Prisma client supports it)
        // For now, we'll skip it if empty to avoid errors until client is regenerated
        // updateData.yearsOfExperience = null;
      }

      // Parse availableHours - handle both JSON string and object
      if (availableHours !== undefined) {
        try {
          updateData.availableHours =
            typeof availableHours === "string"
              ? JSON.parse(availableHours)
              : availableHours || {};
        } catch (error) {
          console.error("Error parsing availableHours:", error);
          updateData.availableHours = {};
        }
      }

      if (req.file) updateData.photo = `/uploads/${req.file.filename}`;

      // Try to update/create profile, handling Prisma client sync issues
      let doctorProfile;
      try {
        doctorProfile = await prisma.doctorProfile.upsert({
          where: { userId: req.user.id },
          update: updateData,
          create: {
            userId: req.user.id,
            bio: bio || "",
            photo: req.file ? `/uploads/${req.file.filename}` : null,
            specialization: (() => {
              try {
                const parsed =
                  typeof specialization === "string"
                    ? JSON.parse(specialization)
                    : specialization;
                return Array.isArray(parsed)
                  ? parsed.filter((s) => s && s.trim())
                  : parsed
                  ? [parsed]
                  : [];
              } catch {
                return specialization
                  ? specialization
                      .split(",")
                      .map((s) => s.trim())
                      .filter((s) => s)
                  : [];
              }
            })(),
            languages: (() => {
              try {
                const parsed =
                  typeof languages === "string"
                    ? JSON.parse(languages)
                    : languages;
                const validLanguages = ["ARABIC", "FRENCH"];
                const filtered = Array.isArray(parsed)
                  ? parsed.filter(
                      (l) => l && validLanguages.includes(l.toUpperCase())
                    )
                  : parsed && validLanguages.includes(parsed.toUpperCase())
                  ? [parsed.toUpperCase()]
                  : [];
                return filtered.length > 0
                  ? filtered.map((l) => l.toUpperCase())
                  : [req.user.preferredLanguage];
              } catch {
                const validLanguages = ["ARABIC", "FRENCH"];
                if (
                  languages &&
                  validLanguages.includes(languages.toUpperCase())
                ) {
                  return [languages.toUpperCase()];
                }
                return [req.user.preferredLanguage];
              }
            })(),
            hourlyRate: (() => {
              if (hourlyRate === undefined || hourlyRate === "") return 0;
              const parsed = parseFloat(hourlyRate);
              return !isNaN(parsed) && parsed >= 0 ? parsed : 0;
            })(),
            // Only include yearsOfExperience if provided (to avoid Prisma errors if client not regenerated)
            ...(yearsOfExperience !== undefined &&
              yearsOfExperience !== "" && {
                yearsOfExperience: (() => {
                  const parsed = parseInt(yearsOfExperience);
                  return !isNaN(parsed) && parsed >= 0 ? parsed : 0;
                })(),
              }),
            availableHours: (() => {
              try {
                return typeof availableHours === "string"
                  ? JSON.parse(availableHours)
                  : availableHours || {};
              } catch {
                return {};
              }
            })(),
          },
          include: {
            statistics: true,
          },
        });
      } catch (prismaError) {
        // If error is about unknown field, try without yearsOfExperience
        if (
          prismaError.message &&
          prismaError.message.includes("yearsOfExperience")
        ) {
          console.warn(
            "Prisma client not regenerated - removing yearsOfExperience from create block"
          );
          const { yearsOfExperience: _, ...updateDataWithoutYears } =
            updateData;
          const createDataWithoutYears = {
            userId: req.user.id,
            bio: bio || "",
            photo: req.file ? `/uploads/${req.file.filename}` : null,
            specialization: (() => {
              try {
                const parsed =
                  typeof specialization === "string"
                    ? JSON.parse(specialization)
                    : specialization;
                return Array.isArray(parsed)
                  ? parsed.filter((s) => s && s.trim())
                  : parsed
                  ? [parsed]
                  : [];
              } catch {
                return specialization
                  ? specialization
                      .split(",")
                      .map((s) => s.trim())
                      .filter((s) => s)
                  : [];
              }
            })(),
            languages: (() => {
              try {
                const parsed =
                  typeof languages === "string"
                    ? JSON.parse(languages)
                    : languages;
                const validLanguages = ["ARABIC", "FRENCH"];
                const filtered = Array.isArray(parsed)
                  ? parsed.filter(
                      (l) => l && validLanguages.includes(l.toUpperCase())
                    )
                  : parsed && validLanguages.includes(parsed.toUpperCase())
                  ? [parsed.toUpperCase()]
                  : [];
                return filtered.length > 0
                  ? filtered.map((l) => l.toUpperCase())
                  : [req.user.preferredLanguage];
              } catch {
                const validLanguages = ["ARABIC", "FRENCH"];
                if (
                  languages &&
                  validLanguages.includes(languages.toUpperCase())
                ) {
                  return [languages.toUpperCase()];
                }
                return [req.user.preferredLanguage];
              }
            })(),
            hourlyRate: (() => {
              if (hourlyRate === undefined || hourlyRate === "") return 0;
              const parsed = parseFloat(hourlyRate);
              return !isNaN(parsed) && parsed >= 0 ? parsed : 0;
            })(),
            availableHours: (() => {
              try {
                return typeof availableHours === "string"
                  ? JSON.parse(availableHours)
                  : availableHours || {};
              } catch {
                return {};
              }
            })(),
          };

          doctorProfile = await prisma.doctorProfile.upsert({
            where: { userId: req.user.id },
            update: updateDataWithoutYears,
            create: createDataWithoutYears,
            include: {
              statistics: true,
            },
          });
        } else {
          throw prismaError;
        }
      }

      res.json({
        success: true,
        message:
          req.t("doctor.profile_updated") || "Profile updated successfully",
        data: { doctorProfile },
      });
    } catch (error) {
      console.error("Error updating doctor profile:", error);
      console.error("Request body:", req.body);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        meta: error.meta,
      });
      next(error);
    }
  }
);

// Get doctor's own profile
router.get(
  "/profile/me",
  authenticate,
  authorize("DOCTOR"),
  async (req, res, next) => {
    try {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          statistics: true,
          bookings: {
            where: {
              status: { in: ["PENDING", "CONFIRMED"] },
            },
            orderBy: { sessionDate: "asc" },
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
            },
          },
        },
      });

      if (!doctorProfile) {
        return res.status(404).json({
          success: false,
          message: req.t("doctor.profile_not_found") || "Profile not found",
        });
      }

      res.json({
        success: true,
        data: { doctorProfile },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get doctor statistics
router.get(
  "/statistics/me",
  authenticate,
  authorize("DOCTOR"),
  async (req, res, next) => {
    try {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id },
        include: {
          statistics: true,
          bookings: {
            include: {
              payment: true,
            },
          },
        },
      });

      if (!doctorProfile) {
        return res.status(404).json({
          success: false,
          message: req.t("doctor.profile_not_found") || "Profile not found",
        });
      }

      // Calculate statistics
      const totalSessions = doctorProfile.bookings.length;
      const completedSessions = doctorProfile.bookings.filter(
        (b) => b.status === "COMPLETED"
      ).length;
      const upcomingSessions = doctorProfile.bookings.filter(
        (b) => b.status === "CONFIRMED" && new Date(b.sessionDate) > new Date()
      ).length;

      const totalEarnings = doctorProfile.bookings
        .filter((b) => b.payment && b.payment.status === "COMPLETED")
        .reduce((sum, b) => sum + b.payment.amount, 0);

      const monthlyEarnings = doctorProfile.bookings
        .filter((b) => {
          if (!b.payment || b.payment.status !== "COMPLETED") return false;
          const paymentDate = new Date(b.payment.createdAt);
          const now = new Date();
          return (
            paymentDate.getMonth() === now.getMonth() &&
            paymentDate.getFullYear() === now.getFullYear()
          );
        })
        .reduce((sum, b) => sum + b.payment.amount, 0);

      // Update statistics
      const statistics = await prisma.doctorStatistics.upsert({
        where: { doctorId: doctorProfile.id },
        update: {
          totalSessions,
          completedSessions,
          upcomingSessions,
          totalEarnings,
          monthlyEarnings,
          lastUpdated: new Date(),
        },
        create: {
          doctorId: doctorProfile.id,
          totalSessions,
          completedSessions,
          upcomingSessions,
          totalEarnings,
          monthlyEarnings,
        },
      });

      res.json({
        success: true,
        data: { statistics },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
