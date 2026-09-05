import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redis } from "../config/redis";

export const createRateLimiter = (max: number, windowMinutes: number) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max, // Limit each IP to `max` requests per `window`
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    store: new RedisStore({
      // @ts-expect-error - Known issue with rate-limit-redis type definitions for ioredis
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    message: {
      status: "error",
      message: "Too many requests from this IP, please try again later.",
    },
  });
};

// Specifically for login/register
export const authRateLimiter = createRateLimiter(5, 15);
