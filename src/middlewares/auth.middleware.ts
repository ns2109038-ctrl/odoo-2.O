import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { verifyToken, isTokenBlacklisted, JwtPayload } from "../utils/jwt";
import { prisma } from "../config/prisma";
import jwt from "jsonwebtoken";

// Augment Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("Authentication required", 401));
    }

    const token = authHeader.split(" ")[1];
    
    // Check if we can decode it to get jti before verification just in case we want to check blacklist first
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    if (!decoded || !decoded.jti) {
      return next(new AppError("Invalid token structure", 401));
    }

    if (await isTokenBlacklisted(decoded.jti)) {
      return next(new AppError("Token has been revoked", 401));
    }

    const payload = verifyToken<JwtPayload>(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true, contactId: true }
    });

    if (!user) {
      return next(new AppError("User not found", 401));
    }

    if (!user.isActive) {
      return next(new AppError("Account is disabled", 403));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("Forbidden: Insufficient privileges", 403));
    }

    next();
  };
};
