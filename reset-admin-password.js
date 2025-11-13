import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    console.log("Resetting admin password...");

    const password = await bcrypt.hash("password123", 10);

    const admin = await prisma.user.update({
      where: { email: "admin@therapy.com" },
      data: {
        password,
        isVerified: true, // Ensure admin is verified
      },
    });

    console.log("✅ Admin password reset successfully!");
    console.log("Email:", admin.email);
    console.log("Role:", admin.role);
    console.log("Verified:", admin.isVerified);
  } catch (error) {
    if (error.code === "P2025") {
      console.log("❌ Admin user not found. Run the seed script first:");
      console.log("   npm run prisma:seed");
    } else {
      console.error("❌ Error:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
