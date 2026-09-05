import express from "express";
import {
	createProduct,
	deleteProduct,
	getAllProducts,
	getFeaturedProducts,
	getProductsByCategory,
	getRecommendedProducts,
	toggleFeaturedProduct,
	getProductById,
	updateProduct,
} from "../controllers/product.controller.js";

import {
	adminRoute,
	protectRoute,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Admin
router.get("/", protectRoute, adminRoute, getAllProducts);

// Public product browsing
router.get("/featured", getFeaturedProducts);
router.get("/category/:category", getProductsByCategory);
router.get("/recommendations", getRecommendedProducts);

// Product details
// Keep this AFTER the named public routes above.
router.get("/:id", getProductById);

// Admin writes
router.post("/", protectRoute, adminRoute, createProduct);

// Full product editing
router.put("/:id", protectRoute, adminRoute, updateProduct);

// Featured toggle
router.patch(
	"/:id",
	protectRoute,
	adminRoute,
	toggleFeaturedProduct
);

router.delete(
	"/:id",
	protectRoute,
	adminRoute,
	deleteProduct
);

export default router;
