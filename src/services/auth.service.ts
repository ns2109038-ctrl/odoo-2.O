import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { AppError, InvalidCredentialsError } from "../utils/errors";
import { generateToken, blacklistToken } from "../utils/jwt";
import crypto from "crypto";

export const checkHaveIBeenPwned = async (password: string): Promise<boolean> => {
  const hash = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) return false; // If API fails, fail open to avoid blocking registration

    const text = await response.text();
    const hashes = text.split("\n").map((line) => line.split(":")[0]);
    return hashes.includes(suffix);
  } catch (err) {
    console.error("HaveIBeenPwned error", err);
    return false;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const registerUser = async (data: { email: string; passwordRaw: string; role: "ADMIN" | "ACCOUNTANT" | "CONTACT"; contactId?: string }) => {
  // Check common passwords
  const commonPasswords = ["password", "123456", "admin", "qwerty", "12345678", "password123"];
  if (commonPasswords.includes(data.passwordRaw.toLowerCase())) {
    throw new AppError("Password is too common", 400);
  }

  // Check HaveIBeenPwned
  const isPwned = await checkHaveIBeenPwned(data.passwordRaw);
  if (isPwned) {
    throw new AppError("Password has appeared in a data breach. Please choose a different one.", 400);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    throw new AppError("Email is already registered", 400);
  }

  const passwordHash = await hashPassword(data.passwordRaw);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: data.role,
      contactId: data.contactId,
    },
    select: { id: true, email: true, role: true }
  });

  return user;
};

export const authenticateUser = async (email: string, passwordRaw: string, ipAddress: string, userAgent?: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Regardless of whether user exists, we record a failed attempt if the password is wrong
  // But wait, if user doesn't exist, we just simulate bcrypt to avoid timing attacks
  if (!user) {
    await bcrypt.compare(passwordRaw, await bcrypt.hash("dummy", 12));
    throw new InvalidCredentialsError();
  }

  if (!user.isActive) {
    throw new AppError("Account is disabled", 403);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError("Account is locked due to too many failed attempts. Try again later.", 403);
  }

  const isValidPassword = await bcrypt.compare(passwordRaw, user.passwordHash);

  if (!isValidPassword) {
    // Record failed attempt
    await prisma.failedAttempt.create({
      data: { email, ipAddress },
    });

    const newAttempts = user.failedLoginAttempts + 1;
    const updateData: any = { failedLoginAttempts: newAttempts };

    if (newAttempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      updateData.failedLoginAttempts = 0; // reset for next time? Or leave it. Let's reset.
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    throw new InvalidCredentialsError();
  }

  // Success login -> clear failed attempts
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  // Issue tokens
  const payload = { sub: user.id, role: user.role };
  const accessToken = generateToken(payload, "15m");
  
  const refreshJti = crypto.randomUUID();
  const refreshToken = crypto.randomBytes(40).toString("hex");
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Enforce Max 3 sessions per user
  const activeSessions = await prisma.refreshToken.findMany({
    where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'asc' },
  });

  if (activeSessions.length >= 3) {
    // Invalidate oldest
    const oldest = activeSessions[0];
    await prisma.refreshToken.update({
      where: { id: oldest.id },
      data: { revokedAt: new Date() },
    });
  }

  // Create new refresh token session
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashedRefreshToken,
      jti: refreshJti,
      expiresAt: refreshTokenExpires,
      ipAddress,
      userAgent,
    },
  });

  return {
    accessToken: accessToken.token,
    refreshToken,
    refreshJti,
    user: { id: user.id, email: user.email, role: user.role }
  };
};

export const rotateRefreshToken = async (providedToken: string, jti: string, ipAddress: string, userAgent?: string) => {
  const session = await prisma.refreshToken.findUnique({ where: { jti } });

  if (!session) {
    throw new AppError("Invalid refresh token", 401);
  }

  if (session.revokedAt) {
    // Attempted to use a revoked token! Potential token theft.
    // Revoke ALL active sessions for this user.
    await prisma.refreshToken.updateMany({
      where: { userId: session.userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    throw new AppError("Invalid refresh token", 401);
  }

  if (session.expiresAt < new Date()) {
    throw new AppError("Refresh token expired", 401);
  }

  // Verify the provided token matches the hash
  const isValid = await bcrypt.compare(providedToken, session.tokenHash);
  if (!isValid) {
    throw new AppError("Invalid refresh token", 401);
  }

  // Absolute timeout check (8 hours from session creation? Or 8 hours of inactivity?)
  // The specs say: "Absolute timeout: 8 hours inactivity = force logout."
  // Wait, if they use the refresh token, they are active. We can update `updatedAt` on session if we had it,
  // But rotation means we create a NEW session. So 8 hours absolute inactivity means we check if `createdAt` of the ORIGINAL session chain is > 8 hours?
  // Let's assume the session itself expires after 7 days, but inactivity means if they haven't refreshed in 8 hours.
  // Actually, to implement absolute 8-hour inactivity, we can just enforce that if `Date.now() - session.createdAt > 8 hours`, we reject if we treat each token as the activity marker.
  // Since we rotate the token on every refresh, `createdAt` of the OLD token being > 8 hours ago shouldn't happen unless they didn't refresh for 8 hours!
  const inactivityTime = Date.now() - session.createdAt.getTime();
  if (inactivityTime > 8 * 60 * 60 * 1000) {
    await prisma.refreshToken.update({ where: { jti }, data: { revokedAt: new Date() } });
    throw new AppError("Session expired due to inactivity", 401);
  }

  // Revoke the old refresh token
  await prisma.refreshToken.update({
    where: { jti },
    data: { revokedAt: new Date() }
  });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) {
    throw new AppError("User account disabled", 403);
  }

  // Issue new tokens
  const payload = { sub: user.id, role: user.role };
  const accessToken = generateToken(payload, "15m");
  
  const newRefreshJti = crypto.randomUUID();
  const newRefreshTokenRaw = crypto.randomBytes(40).toString("hex");
  const hashedRefreshToken = await bcrypt.hash(newRefreshTokenRaw, 10);
  const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashedRefreshToken,
      jti: newRefreshJti,
      expiresAt: refreshTokenExpires,
      ipAddress,
      userAgent,
    },
  });

  return {
    accessToken: accessToken.token,
    refreshToken: newRefreshTokenRaw,
    refreshJti: newRefreshJti,
  };
};

export const logoutUser = async (accessJti: string, accessExpiresAt: Date, refreshJti: string) => {
  // Blacklist the access token
  await blacklistToken(accessJti, accessExpiresAt, "logout");

  // Revoke the refresh token in DB
  if (refreshJti) {
    await prisma.refreshToken.updateMany({
      where: { jti: refreshJti },
      data: { revokedAt: new Date() }
    });
  }
};

export const getActiveSessions = async () => {
  return prisma.refreshToken.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, jti: true, userId: true, createdAt: true, ipAddress: true, userAgent: true },
    orderBy: { createdAt: 'desc' }
  });
};
