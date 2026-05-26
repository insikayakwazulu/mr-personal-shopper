import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
	initializeTransaction,
	verifyTransaction,
	createEftOrder,
	getOrderById,
} from "../controllers/payment.controller.js";

const router = express.Router();

/**
 * ✅ EFT checkout (PUBLIC)
 * Allows guest orders (no login required)
 */
router.post("/eft-create-order", createEftOrder);

/**
 * ✅ Success page helper (PUBLIC)
 * Lets frontend fetch order info after redirect
 */
router.get("/orders/:orderId", getOrderById);

/**
 * 🔒 Paystack flow (keep protected for later)
 */
router.post("/initialize-transaction", protectRoute, initializeTransaction);
router.post("/verify-transaction", protectRoute, verifyTransaction);

export default router;
