// backend/controllers/cart.controller.js

import Product from "../models/product.model.js";

// Helper: normalize selectedOptions so we can compare reliably
function normalizeSelectedOptions(so) {
	if (!so || typeof so !== "object") return null;

	return {
		color: (so.color || "").trim(),
		size: (so.size || "").trim(),
		variantSku: (so.variantSku || "").trim(),
	};
}

function sameSelectedOptions(a, b) {
	const A = normalizeSelectedOptions(a);
	const B = normalizeSelectedOptions(b);

	// If both are null/empty -> treat as same (no options)
	if (!A && !B) return true;

	// If one exists and the other doesn't -> not same
	if (!A || !B) return false;

	return A.color === B.color && A.size === B.size && A.variantSku === B.variantSku;
}

export const getCartProducts = async (req, res) => {
	try {
		// ✅ Populate product details for each cart item
		await req.user.populate("cartItems.product");

		// Build a clean response the frontend expects
		const cartItems = (req.user.cartItems || [])
			.filter((ci) => ci.product) // safety
			.map((ci) => ({
				...ci.product.toJSON(),
				quantity: ci.quantity,
				selectedOptions: ci.selectedOptions || null,
				// optional line identifier for later upgrades
				cartItemId: ci._id,
			}));

		return res.json(cartItems);
	} catch (error) {
		console.log("Error in getCartProducts controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const addToCart = async (req, res) => {
	try {
		const { productId, selectedOptions } = req.body;
		const user = req.user;

		if (!productId) {
			return res.status(400).json({ message: "productId is required" });
		}

		// Optional: confirm product exists (prevents bad ids in cart)
		const productExists = await Product.exists({ _id: productId });
		if (!productExists) {
			return res.status(404).json({ message: "Product not found" });
		}

		const cleanOptions = normalizeSelectedOptions(selectedOptions);

		// ✅ Find existing cart line by product + selectedOptions
		const existingItem = (user.cartItems || []).find(
			(item) =>
				String(item.product) === String(productId) &&
				sameSelectedOptions(item.selectedOptions, cleanOptions)
		);

		if (existingItem) {
			existingItem.quantity += 1;
		} else {
			user.cartItems.push({
				product: productId,
				quantity: 1,
				selectedOptions: cleanOptions, // may be null
			});
		}

		await user.save();

		// Return updated cart (frontend expects array of products via GET /cart,
		// but returning cartItems here is fine too)
		return res.json(user.cartItems);
	} catch (error) {
		console.log("Error in addToCart controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const removeAllFromCart = async (req, res) => {
	try {
		const { productId } = req.body;
		const user = req.user;

		if (!productId) {
			user.cartItems = [];
		} else {
			user.cartItems = (user.cartItems || []).filter(
				(item) => String(item.product) !== String(productId)
			);
		}

		await user.save();
		return res.json(user.cartItems);
	} catch (error) {
		console.log("Error in removeAllFromCart controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const updateQuantity = async (req, res) => {
	try {
		const { id: productId } = req.params;
		const { quantity } = req.body;
		const user = req.user;

		const qty = Number(quantity);

		if (!Number.isFinite(qty) || qty < 0) {
			return res.status(400).json({ message: "quantity must be a number >= 0" });
		}

		// ✅ Find FIRST matching cart line by product
		// (Later we can upgrade to update by cartItemId/cartKey for variant-specific lines)
		const existingItem = (user.cartItems || []).find(
			(item) => String(item.product) === String(productId)
		);

		if (!existingItem) {
			return res.status(404).json({ message: "Product not found in cart" });
		}

		if (qty === 0) {
			user.cartItems = (user.cartItems || []).filter(
				(item) => String(item.product) !== String(productId)
			);
			await user.save();
			return res.json(user.cartItems);
		}

		existingItem.quantity = qty;
		await user.save();
		return res.json(user.cartItems);
	} catch (error) {
		console.log("Error in updateQuantity controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};