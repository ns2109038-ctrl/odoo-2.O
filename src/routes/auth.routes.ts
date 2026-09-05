import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { authRateLimiter } from "../middlewares/rateLimit.middleware";

const router = Router();

router.post("/register", authenticate, authorize(["ADMIN", "ACCOUNTANT"]), authRateLimiter, authController.register);
router.post("/login", authRateLimiter, authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

router.get("/me", authenticate, authController.getMe);
router.post("/change-password", authenticate, authController.changePassword);
router.get("/sessions", authenticate, authorize(["ADMIN"]), authController.getSessions);

export default router;
