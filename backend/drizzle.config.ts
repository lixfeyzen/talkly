import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// dotenv's default `import "dotenv/config"` only loads a file literally
// named `.env` -- this project's secrets live in `.env.local` (Next.js
// convention), so the path must be explicit or DATABASE_URL never loads.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
