import express from "express";
import serverless from "serverless-http";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import middleware from "i18next-http-middleware";
import fs from "fs";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import doctorRoutes from "./routes/doctor.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import messageRoutes from "./routes/message.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import translationRoutes from "./routes/translation.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import sessionNoteRoutes from "./routes/sessionNote.routes.js";

// Import error handler
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

// Initialize i18next
i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    lng: "fr",
    fallbackLng: "fr",
    backend: { loadPath: "./locales/{{lng}}/{{ns}}.json" },
    detection: {
      order: ["header", "querystring", "cookie"],
      caches: ["cookie"],
    },
  });

// Create uploads directory if it doesn't exist
const uploadsDir = "./uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use("/uploads", express.static("uploads"));
app.use(helmet());
app.use(morgan("dev"));
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(middleware.handle(i18next));

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

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// ✅ Export for Vercel
export const handler = serverless(app);
