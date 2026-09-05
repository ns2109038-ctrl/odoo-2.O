import { z } from "zod";
import dotenv from "dotenv";
import process from "process";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_PRIVATE_KEY: z.string(), // Base64 encoded or raw PEM
  JWT_PUBLIC_KEY: z.string(), // Base64 encoded or raw PEM
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("Invalid environment variables:\n", _env.error.format());
  process.exit(1);
}

export const env = _env.data;
