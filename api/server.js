import express from "express";
import serverless from "serverless-http";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import middleware from "i18next-http-middleware";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from "../routes/auth.routes.js";
import userRoutes from "../routes/user.routes.js";
import doctorRoutes from "../routes/doctor.routes.js";
import bookingRoutes from "../routes/booking.routes.js";
import messageRoutes from "../routes/message.routes.js";
import paymentRoutes from "../routes/payment.routes.js";
import adminRoutes from "../routes/admin.routes.js";
import translationRoutes from "../routes/translation.routes.js";
import reviewRoutes from "../routes/review.routes.js";
import sessionNoteRoutes from "../routes/sessionNote.routes.js";

// Import error handler
import { errorHandler } from "../middleware/errorHandler.js";

dotenv.config();

const app = express();

// Note: Socket.io is disabled for Vercel deployment
// Socket.io requires persistent connections which don't work with serverless functions
// For real-time features, consider using a separate service or Vercel's Edge Functions

// Initialize i18next
i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    lng: "fr", // default language
    fallbackLng: "fr",
    backend: {
      loadPath: path.join(__dirname, "../locales/{{lng}}/{{ns}}.json"),
    },
    detection: {
      order: ["header", "querystring", "cookie"],
      caches: ["cookie"],
    },
  });

// Note: File uploads on Vercel should use external storage (S3, Vercel Blob, etc.)
// The /tmp directory is available but is ephemeral and cleared between function invocations
// For production, configure multer to use cloud storage
// For local development, uncomment the following if needed:
// import fs from "fs";
// const uploadsDir = "./uploads";
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true });
// }
// app.use("/uploads", express.static("uploads"));

// Middleware
app.use(helmet());
app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(middleware.handle(i18next));

// Socket.io initialization disabled for Vercel
// Uncomment if deploying to a platform that supports persistent connections
// initializeSocket(io);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/translations", translationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/session-notes", sessionNoteRoutes);

// Debug: Log all registered routes
console.log("Registered routes:");
console.log("  POST /api/bookings - Create booking");
console.log("  GET  /api/bookings/test - Test route");
console.log("  GET  /api/bookings/me - Get user bookings");
console.log("  GET  /api/bookings/:id - Get single booking");

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Export handler for Vercel
export const handler = serverless(app);

// For local development, start server normally
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}
