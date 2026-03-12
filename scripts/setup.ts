/**
 * Full setup script for Agile Artifact Analyzer
 * Run: npx tsx scripts/setup.ts
 *
 * This will:
 * 1. Create all database tables (schema)
 * 2. Create the admin user (admin@mastercard.com / admin123)
 * 3. Load reference documents from SQL seed (fast) or re-process PDFs
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

  // Step 3: Load reference documents
  console.log("Step 3/3: Loading reference documents...");

  const sqlSeedPath = path.join(process.cwd(), "seeds", "reference_documents.sql");
  const seedsPdfsDir = path.join(process.cwd(), "seeds", "pdfs");
  const attachedAssetsDir = path.join(process.cwd(), "attached_assets");

  // Check if documents already exist
  const pg = _require("pg");
  const pgClient = new pg.Client(process.env.DATABASE_URL);
  await pgClient.connect();
  const countResult = await pgClient.query("SELECT COUNT(*) FROM reference_documents");
  const existingCount = parseInt(countResult.rows[0].count);
  await pgClient.end();

  if (existingCount > 0) {
    console.log(`✓ Reference documents already loaded (${existingCount} chunks) — skipping\n`);
  } else if (fs.existsSync(sqlSeedPath)) {
    // Fast path: load from SQL seed file
    console.log("  Loading from SQL seed file (fast)...");
    const pg2 = _require("pg");
    const client = new pg2.Client(process.env.DATABASE_URL);
    await client.connect();
    const sql = fs.readFileSync(sqlSeedPath, "utf-8");
    await client.query(sql);
    await client.end();
    console.log("✓ Reference documents loaded from seed file (312 chunks)\n");
  } else {
    // Slow path: process PDFs
    const pdfDir = fs.existsSync(seedsPdfsDir) ? seedsPdfsDir : attachedAssetsDir;
    const pdfFiles = fs.existsSync(pdfDir)
      ? fs.readdirSync(pdfDir).filter(f => f.endsWith(".pdf"))
      : [];

    if (pdfFiles.length === 0) {
      console.log("⚠ No PDF seed file and no PDFs found.");
      console.log("  Upload documents via admin panel → Reference Docs tab after startup.\n");
    } else {
      console.log(`  Processing ${pdfFiles.length} PDFs from ${pdfDir}...`);

      // Copy PDFs to attached_assets if they're in seeds/pdfs
      if (pdfDir === seedsPdfsDir) {
        if (!fs.existsSync(attachedAssetsDir)) fs.mkdirSync(attachedAssetsDir, { recursive: true });
        for (const pdf of pdfFiles) {
          fs.copyFileSync(path.join(seedsPdfsDir, pdf), path.join(attachedAssetsDir, pdf));
        }
      }

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
  }

  console.log("========================================");
  console.log("  Setup complete!");
  console.log("========================================");
  console.log("\nStart the app:");
  console.log("  Development:  npm run dev");
  console.log("  Production:   npm run build && npm start");
  console.log("\nLogin credentials:");
  console.log("  Email:    admin@mastercard.com");
  console.log("  Password: admin123\n");

  process.exit(0);
}

run().catch(err => {
  console.error("Setup failed:", err);
  process.exit(1);
});
