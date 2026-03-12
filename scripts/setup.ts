/**
 * Full setup script for Agile Artifact Analyzer
 * Run: npx tsx scripts/setup.ts
 *
 * This will:
 * 1. Create all database tables (schema)
 * 2. Create the admin user (admin@mastercard.com / admin123)
 * 3. Process all reference PDF documents for RAG
 */

import { execSync } from "child_process";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import * as path from "path";
import * as fs from "fs";

const _require = typeof require !== "undefined"
  ? require
  : createRequire(fileURLToPath(`file://${path.resolve(process.cwd(), "scripts/setup.ts")}`));

async function run() {
  console.log("\n========================================");
  console.log("  Agile Artifact Analyzer - Setup");
  console.log("========================================\n");

  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is not set.");
    console.error("Please set it before running setup:\n");
    console.error("  export DATABASE_URL=postgresql://user:pass@host:5432/dbname\n");
    process.exit(1);
  }

  // Step 1: Push schema
  console.log("Step 1/3: Creating database schema...");
  try {
    execSync("npm run db:push", { stdio: "inherit" });
    console.log("✓ Schema created\n");
  } catch {
    console.error("Schema push failed. Trying with --force...");
    try {
      execSync("npx drizzle-kit push --force", { stdio: "inherit" });
      console.log("✓ Schema created\n");
    } catch (e) {
      console.error("ERROR: Could not create schema:", e);
      process.exit(1);
    }
  }

  // Step 2: Seed admin user
  console.log("Step 2/3: Creating admin user...");
  const { db } = await import("../server/db.js");
  const { users } = await import("../shared/schema.js");
  const bcrypt = _require("bcrypt");
  const { eq } = await import("drizzle-orm");

  const adminEmail = "admin@mastercard.com";
  const adminPassword = "admin123";
  const [existing] = await db.select().from(users).where(eq(users.email, adminEmail));

  if (existing) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await db.update(users).set({ password: hashed }).where(eq(users.email, adminEmail));
    console.log(`✓ Admin password reset: ${adminEmail} / ${adminPassword}\n`);
  } else {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await db.insert(users).values({ email: adminEmail, password: hashed, isAdmin: true });
    console.log(`✓ Admin created: ${adminEmail} / ${adminPassword}\n`);
  }

  // Step 3: Process reference documents
  console.log("Step 3/3: Processing reference PDF documents for RAG...");
  const attachedAssetsDir = path.join(process.cwd(), "attached_assets");
  const pdfFiles = fs.existsSync(attachedAssetsDir)
    ? fs.readdirSync(attachedAssetsDir).filter(f => f.endsWith(".pdf"))
    : [];

  if (pdfFiles.length === 0) {
    console.log("⚠ No PDF files found in attached_assets/. Skipping document processing.");
    console.log("  To process documents later, log in as admin and use the Reference Docs panel.\n");
  } else {
    const { processAllDocuments } = await import("../server/pdf-processor.js");
    const result = await processAllDocuments();
    for (const r of result.results) {
      if (r.status === "success") {
        console.log(`  ✓ ${r.docName}: ${r.pageCount} chunks`);
      } else {
        console.log(`  ✗ ${r.docName}: ${r.status}`);
      }
    }
    console.log();
  }

  console.log("========================================");
  console.log("  Setup complete!");
  console.log("========================================");
  console.log("\nYou can now start the app:");
  console.log("  Development:  npm run dev");
  console.log("  Production:   npm run build && npm start");
  console.log("\nLogin credentials:");
  console.log("  Email:    admin@mastercard.com");
  console.log("  Password: admin123");
  console.log("\nEnvironment variables required:");
  console.log("  DATABASE_URL   - PostgreSQL connection string");
  console.log("  SESSION_SECRET - Random secret for sessions");
  console.log("  OPENAI_API_KEY - Your OpenAI API key (if not on Replit)\n");

  process.exit(0);
}

run().catch(err => {
  console.error("Setup failed:", err);
  process.exit(1);
});
