import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as authService from "../services/auth.service";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*]/, "Password must contain at least one special character (!@#$%^&*)"),
  role: z.enum(["ADMIN", "ACCOUNTANT", "CONTACT"]),
  contactId: z.string().uuid().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    
    // Additional validation: Contact user registration cannot happen via public endpoint directly without proper admin,
    // but this endpoint is protected by `authorize(["ADMIN", "ACCOUNTANT"])` in the routes.
    if (data.role === "CONTACT" && !data.contactId) {
      return res.status(400).json({ status: "error", message: "contactId is required for CONTACT role" });
    }

    const user = await authService.registerUser({
      email: data.email,
      passwordRaw: data.password,
      role: data.role,
      contactId: data.contactId,
    });

    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const ipAddress = req.ip || req.socket.remoteAddress || "0.0.0.0";
    const userAgent = req.headers["user-agent"];

    const result = await authService.authenticateUser(data.email, data.password, ipAddress, userAgent);

    // Set refresh token in httpOnly cookie
    res.cookie("refreshToken", JSON.stringify({ token: result.refreshToken, jti: result.refreshJti }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      status: "success",
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookieData = req.cookies.refreshToken;
    if (!cookieData) {
      return res.status(401).json({ status: "error", message: "No refresh token provided" });
    }

    let parsedCookie;
    try {
      parsedCookie = JSON.parse(cookieData);
    } catch {
      return res.status(401).json({ status: "error", message: "Invalid refresh token format" });
    }

    const ipAddress = req.ip || req.socket.remoteAddress || "0.0.0.0";
    const userAgent = req.headers["user-agent"];

    const result = await authService.rotateRefreshToken(parsedCookie.token, parsedCookie.jti, ipAddress, userAgent);

    // Update cookie
    res.cookie("refreshToken", JSON.stringify({ token: result.refreshToken, jti: result.refreshJti }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      status: "success",
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    let accessJti = "";
    let accessExpiresAt = new Date();

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      if (decoded && decoded.jti && decoded.exp) {
        accessJti = decoded.jti;
        accessExpiresAt = new Date(decoded.exp * 1000);
      }
    }

    let refreshJti = "";
    const cookieData = req.cookies.refreshToken;
    if (cookieData) {
      try {
        const parsedCookie = JSON.parse(cookieData);
        refreshJti = parsedCookie.jti;
      } catch {}
    }

    if (accessJti || refreshJti) {
      await authService.logoutUser(accessJti, accessExpiresAt, refreshJti);
    }

    // Clear cookies
    res.clearCookie("refreshToken");

    // We can't clear localStorage/sessionStorage directly from backend,
    // but we can send a header or response directing the frontend to do it.
    // The requirement says "On logout, clear all cookies + localStorage + sessionStorage from client."
    // We send a specific flag so frontend knows to clear storage.
    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
      clearStorage: true
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      status: "success",
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await authService.getActiveSessions();
    res.status(200).json({
      status: "success",
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
};

const changePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(8)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*]/, "Password must contain at least one special character (!@#$%^&*)"),
});

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    // Since this is authenticated, req.user is available
    if (!req.user || !req.user.id) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }
    const userId = req.user.id;

    // Check old password
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ status: "error", message: "User not found" });

    const isValid = await bcrypt.compare(data.oldPassword, user.passwordHash);
    if (!isValid) return res.status(401).json({ status: "error", message: "Invalid old password" });

    // Validate new against HaveIBeenPwned & common list
    const commonPasswords = ["password", "123456", "admin", "qwerty", "12345678", "password123"];
    if (commonPasswords.includes(data.newPassword.toLowerCase())) {
      return res.status(400).json({ status: "error", message: "Password is too common" });
    }

    const isPwned = await authService.checkHaveIBeenPwned(data.newPassword);
    if (isPwned) {
      return res.status(400).json({ status: "error", message: "Password has appeared in a data breach." });
    }

    const passwordHash = await authService.hashPassword(data.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    res.status(200).json({ status: "success", message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};
