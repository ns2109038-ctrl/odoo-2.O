export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Requirement: Return SAME error message for wrong email OR wrong password: "Invalid credentials." NEVER reveal which one is wrong.
export class InvalidCredentialsError extends AppError {
  constructor() {
    super("Invalid credentials.", 401);
  }
}
