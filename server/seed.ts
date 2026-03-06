import { db } from "./db";
import { users } from "@shared/schema";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq } from "drizzle-orm";

function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(crypto.randomInt(chars.length));
  }
  return password;
}

export async function seedAdminUser() {
  const adminEmail = "admin@mastercard.com";
  const [existing] = await db.select().from(users).where(eq(users.email, adminEmail));
  if (!existing) {
    const plainPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    await db.insert(users).values({
      email: adminEmail,
      password: hashedPassword,
      isAdmin: true,
    });
    console.log(`[SETUP] Admin user created: ${adminEmail}`);
    console.log(`[SETUP] Generated password: ${plainPassword}`);
    console.log(`[SETUP] ⚠ Save this password now — it will not be shown again.`);
  }
}
