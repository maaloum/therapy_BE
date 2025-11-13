import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("Running database migrations...");
try {
  execSync("npx prisma migrate deploy --schema=./prisma/schema.prisma", {
    stdio: "inherit",
    cwd: join(__dirname, ".."),
  });
  console.log("✅ Migrations completed successfully!");
} catch (error) {
  console.error("❌ Migration failed:", error.message);
  process.exit(1);
}
