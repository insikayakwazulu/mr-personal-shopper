import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/**
 * Paystack instance for all API calls.
 * Uses the secret key from .env for authentication.
 */
export const paystack = axios.create({
	baseURL: "https://api.paystack.co",
	headers: {
		Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
		"Content-Type": "application/json",
	},
});
