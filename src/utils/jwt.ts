import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./errors";
import crypto from "crypto";
import { redis } from "../config/redis";

// Normalize keys to ensure they are properly formatted PEM
const privateKey = env.JWT_PRIVATE_KEY.replace(/\\n/g, "\n");
const publicKey = env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");

export interface JwtPayload {
  sub: string; // userId
  role: string;
  jti: string;
}

export const generateToken = (
  payload: Omit<JwtPayload, "jti">,
  expiresIn: string | number,
  jti?: string
): { token: string; jti: string } => {
  const tokenJti = jti || crypto.randomUUID();
  const options: SignOptions = {
    algorithm: "RS256",
    expiresIn: expiresIn as SignOptions["expiresIn"],
    jwtid: tokenJti,
  };

  const token = jwt.sign(payload, privateKey, options);
  return { token, jti: tokenJti };
};

export const verifyToken = <T>(token: string): T => {
  try {
    const options: VerifyOptions = {
      algorithms: ["RS256"],
    };
    return jwt.verify(token, publicKey, options) as T;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError("Token expired", 401);
    }
    throw new AppError("Invalid token", 401);
  }
};

export const blacklistToken = async (jti: string, expiresAt: Date, reason?: string) => {
  // Store in Redis with TTL based on exact expiration
  const ttl = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  if (ttl > 0) {
    await redis.set(`blacklist:${jti}`, reason || "revoked", "EX", ttl);
  }
};

export const isTokenBlacklisted = async (jti: string): Promise<boolean> => {
  const exists = await redis.exists(`blacklist:${jti}`);
  return exists === 1;
};
