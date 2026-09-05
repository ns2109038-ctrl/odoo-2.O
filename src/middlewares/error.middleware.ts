import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { ZodError } from "zod";

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    const issues = (err as any).issues || (err as any).errors;
    return res.status(400).json({
      status: "error",
      message: "Validation Error",
      errors: issues.map((e: any) => ({ path: e.path?.join("."), message: e.message })),
    });
  }

  // Fallback for unhandled errors
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};
