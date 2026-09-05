import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import { errorHandler } from "./middlewares/error.middleware";

const app = express();

// Security Headers
app.use(helmet());
app.use(
  helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
  })
);
app.use(helmet.noSniff());
app.use(helmet.frameguard({ action: "deny" }));

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/v1/auth", authRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
