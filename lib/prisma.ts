import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Render free tier PostgreSQL has ~10-20 max connections
// We limit to 5 to leave room for other operations and prevent pool exhaustion
// This is critical when scaling to 1000 monitors with concurrent checks
const connectionString = process.env.DATABASE_URL;

// Add connection_limit param if not present
const getConnectionUrl = () => {
  if (!connectionString) return connectionString;
  if (connectionString.includes("connection_limit")) return connectionString;
  
  const separator = connectionString.includes("?") ? "&" : "?";
  return `${connectionString}${separator}connection_limit=5`;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getConnectionUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;