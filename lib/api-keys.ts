import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const KEY_PREFIX = "lat";

export async function generateApiKey(userId: string, name: string, expiresInDays?: number) {
  // Generate random secret: lat_live_abc123xyz...
  const env = process.env.NODE_ENV === "production" ? "live" : "test";
  const randomPart = crypto.randomBytes(32).toString("base64url").slice(0, 32);
  const fullKey = `${KEY_PREFIX}_${env}_${randomPart}`;
  
  // Hash for storage
  const keyHash = await bcrypt.hash(fullKey, 10);
  
  const expiresAt = expiresInDays 
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) 
    : null;

  await prisma.apiKey.create({
    data: {
      userId,
      name,
      keyPrefix: `${KEY_PREFIX}_${env}_`,
      keyHash,
      expiresAt,
    },
  });

  // Return the key ONCE - never stored in plaintext again
  return fullKey;
}

export async function validateApiKey(key: string): Promise<string | null> {
  if (!key.startsWith(`${KEY_PREFIX}_`)) return null;
  
  const parts = key.split("_");
  if (parts.length < 3) return null;
  
  const prefix = parts.slice(0, 2).join("_") + "_";
  
  // Find keys with this prefix (limit 10 for performance)
  const candidates = await prisma.apiKey.findMany({
    where: {
      keyPrefix: prefix,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    },
    take: 10,
  });

  for (const candidate of candidates) {
    const valid = await bcrypt.compare(key, candidate.keyHash);
    if (valid) {
      // Update last used (fire and forget)
      prisma.apiKey.update({
        where: { id: candidate.id },
        data: { lastUsedAt: new Date() }
      }).catch(() => {});
      
      return candidate.userId;
    }
  }
  
  return null;
}

export async function revokeApiKey(userId: string, keyId: string) {
  await prisma.apiKey.deleteMany({
    where: { id: keyId, userId },
  });
}