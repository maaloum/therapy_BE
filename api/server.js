import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import middleware from "i18next-http-middleware";
import fs from "fs";
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

// Import socket handler
import { initializeSocket } from "../socket/socketHandler.js";

// Import error handler
import { errorHandler } from "../middleware/errorHandler.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
// Socket.io CORS configuration - support Vercel deployments
const socketOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://therapy-n8zh1gyv8-maaloums-projects.vercel.app",
    ];

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      const isAllowed = socketOrigins.some((allowedOrigin) => {
        return (
          origin === allowedOrigin ||
          origin.match(/^https:\/\/therapy-.*\.vercel\.app$/)
        );
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true, // Allow Engine.IO v3 clients
});

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

// Create uploads directory if it doesn't exist
const uploadsDir = "./uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use("/uploads", express.static("uploads"));

// Middleware
app.use(helmet());
app.use(morgan("dev"));
// CORS configuration - support multiple origins
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://therapy-n8zh1gyv8-maaloums-projects.vercel.app",
      /^https:\/\/therapy-.*\.vercel\.app$/, // Allow all Vercel preview deployments
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if origin matches allowed origins
      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        if (typeof allowedOrigin === "string") {
          return origin === allowedOrigin;
        } else if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(middleware.handle(i18next));

// Initialize Socket.io
initializeSocket(io);

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

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

export { io };
