import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { redis } from "./config/redis";

const startServer = async () => {
  try {
    // Check DB Connection
    await prisma.$connect();
    console.log("PostgreSQL connected via Prisma.");

    // Redis connection is handled in its own module but we can wait for ready or just assume it connects
    // Since it's ioredis, it handles reconnects internally.
    
    app.listen(env.PORT, () => {
      console.log(`Auth Module Server is running on port ${env.PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
};

startServer();
