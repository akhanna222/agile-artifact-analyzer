import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import crypto from "crypto";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const PgStore = connectPg(session);

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(
    session({
      store: new PgStore({
        pool,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      proxy: isProduction,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
      },
    })
  );
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = await storage.getUserById(req.session.userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(crypto.randomInt(chars.length));
  }
  return password;
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, isAdmin: user.isAdmin });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    res.json({ id: user.id, email: user.email, isAdmin: user.isAdmin });
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getUsers();
      res.json(allUsers.map((u) => ({ id: u.id, email: u.email, isAdmin: u.isAdmin, createdAt: u.createdAt })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const { email, isAdmin, password: providedPassword } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      if (providedPassword !== undefined && providedPassword !== "" && typeof providedPassword === "string" && providedPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "User with this email already exists" });
      }

      const plainPassword = (providedPassword && providedPassword.trim()) ? providedPassword.trim() : generatePassword();
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const user = await storage.createUser({
        email,
        password: hashedPassword,
        isAdmin: isAdmin || false,
      });

      res.json({
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        generatedPassword: plainPassword,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.get("/api/admin/usage", requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getUsageStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });

  app.get("/api/admin/documents", requireAdmin, async (_req, res) => {
    try {
      const summary = await storage.getReferenceDocumentSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/admin/process-documents", requireAdmin, async (_req, res) => {
    try {
      const { processAllDocuments } = await import("./pdf-processor");
      res.json({ message: "Document processing started" });
      processAllDocuments().then(result => {
        console.log("Document processing complete:", JSON.stringify(result));
      }).catch(err => {
        console.error("Document processing failed:", err);
      });
    } catch (error) {
      console.error("Error starting document processing:", error);
      res.status(500).json({ error: "Failed to start document processing" });
    }
  });

  app.post("/api/admin/process-document/:docName", requireAdmin, async (req, res) => {
    try {
      const { processDocument, getAvailableDocuments } = await import("./pdf-processor");
      const docName = req.params.docName;
      const docs = getAvailableDocuments();
      const doc = docs.find(d => d.docName === docName);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json({ message: `Processing ${docName} started` });
      processDocument(doc).then(result => {
        console.log(`Processing ${docName} complete: ${result.pageCount} chunks`);
      }).catch(err => {
        console.error(`Processing ${docName} failed:`, err);
      });
    } catch (error) {
      console.error("Error processing document:", error);
      res.status(500).json({ error: "Failed to process document" });
    }
  });

  app.delete("/api/admin/documents/:docName", requireAdmin, async (req, res) => {
    try {
      await storage.deleteReferenceDocumentsByName(req.params.docName);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (req.session.userId === id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  return { requireAuth, requireAdmin };
}
