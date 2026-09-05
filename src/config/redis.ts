import Redis from "ioredis";
import { env } from "./env";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 2) {
      return null; // Stop retrying after 2 attempts if Redis is not active locally
    }
    return Math.min(times * 500, 2000);
  },
});

let loggedWarning = false;
redis.on("error", (error) => {
  if (!loggedWarning) {
    console.warn("⚠️  Redis server is not running on localhost:6379 (Optional in dev mode).");
    loggedWarning = true;
  }
});

redis.on("connect", () => {
  console.log("Redis connected successfully");
});
