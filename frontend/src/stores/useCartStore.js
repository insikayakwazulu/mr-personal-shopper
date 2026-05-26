// frontend/src/stores/useCartStore.js

import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

function isAuthProblem(error) {
	const status = error?.response?.status;
	const msg = (error?.response?.data?.message || error?.message || "").toLowerCase();

	if (status === 401 || status === 403) return true;
	if (msg.includes("token refresh temporarily unavailable")) return true;

	return false;
}

function handleRequestError(error, { onAuthFailMessage = "Please login to continue." } = {}) {
	if (isAuthProblem(error)) {
		toast.error(onAuthFailMessage);

		try {
			localStorage.setItem("post_login_redirect", window.location.pathname);
		} catch {}

		window.location.href = "/login";
		return;
	}

	const apiMsg = error?.response?.data?.message;
	toast.error(apiMsg || "An error occurred");
}

/**
 * ✅ Build a stable key for a cart line item.
 * This lets the same product be added multiple times with different options
 * (color/size/sku) without overwriting.
 */
function buildCartKey(productOrItem) {
	const id = productOrItem?._id || productOrItem?.productId || "";

	const so =
		productOrItem?.selectedOptions ||
		productOrItem?.optionsSelected || // fallback just in case
		{};

	const color = (so?.color || "").trim().toLowerCase();
	const size = (so?.size || "").trim().toLowerCase();
	const sku = (so?.variantSku || "").trim().toLowerCase();

	return `${id}::${color}|${size}|${sku}`;
}

function normalizeSelectedOptions(input) {
	const so =
		input?.selectedOptions ||
		input?.selected_options ||
		input?.optionsSelected ||
		input ||
		{};

	return {
		color: typeof so.color === "string" ? so.color.trim() : "",
		size: typeof so.size === "string" ? so.size.trim() : "",
		variantSku: typeof so.variantSku === "string" ? so.variantSku.trim() : "",
	};
}

export const useCartStore = create((set, get) => ({
	cart: [],
	coupon: null,
	total: 0,
	subtotal: 0,
	isCouponApplied: false,

	getMyCoupon: async () => {
		try {
			const response = await axios.get("/coupons");
			set({ coupon: response.data });
		} catch (error) {
			if (isAuthProblem(error)) return;
			console.error("Error fetching coupon:", error);
		}
	},

	applyCoupon: async (code) => {
		try {
			const response = await axios.post("/coupons/validate", { code });
			set({ coupon: response.data, isCouponApplied: true });
			get().calculateTotals();
			toast.success("Coupon applied successfully");
		} catch (error) {
			handleRequestError(error, { onAuthFailMessage: "Please login to apply a coupon." });
		}
	},

	removeCoupon: () => {
		set({ coupon: null, isCouponApplied: false });
		get().calculateTotals();
		toast.success("Coupon removed");
	},

	getCartItems: async () => {
		try {
			const res = await axios.get("/cart");

			// ✅ Ensure each line item has:
			// - selectedOptions normalized
			// - cartKey stable
			const incoming = Array.isArray(res.data) ? res.data : [];
			const normalized = incoming.map((item) => {
				const selectedOptions = normalizeSelectedOptions(item);
				return {
					...item,
					selectedOptions,
					cartKey: item.cartKey || buildCartKey({ ...item, selectedOptions }),
				};
			});

			set({ cart: normalized });
			get().calculateTotals();
		} catch (error) {
			if (isAuthProblem(error)) {
				set({ cart: [] });
				return;
			}

			set({ cart: [] });
			handleRequestError(error);
		}
	},

	clearCart: () => {
		set({ cart: [], coupon: null, total: 0, subtotal: 0, isCouponApplied: false });
	},

	/**
	 * ✅ addToCart supports selectedOptions (color/size/sku) from ProductDetailsPage.
	 * We send selectedOptions to backend, so backend can store it per line.
	 */
	addToCart: async (product) => {
		try {
			const productId = product?._id;
			if (!productId) {
				toast.error("Missing product id.");
				return;
			}

			const selectedOptions = normalizeSelectedOptions(product?.selectedOptions || product);

			// ✅ backend call (now supported by backend/controllers/cart.controller.js)
			await axios.post("/cart", {
				productId,
				selectedOptions,
			});

			toast.success("Product added to cart");

			set((prevState) => {
				const cartKey = buildCartKey({ ...product, selectedOptions });

				const existingItem = prevState.cart.find((item) => {
					const key = item.cartKey || buildCartKey({ ...item, selectedOptions: normalizeSelectedOptions(item) });
					return key === cartKey;
				});

				const newCart = existingItem
					? prevState.cart.map((item) => {
							const key =
								item.cartKey ||
								buildCartKey({ ...item, selectedOptions: normalizeSelectedOptions(item) });

							return key === cartKey ? { ...item, quantity: (item.quantity || 0) + 1 } : item;
					  })
					: [
							...prevState.cart,
							{
								...product,
								_id: productId, // ensure present
								selectedOptions,
								cartKey,
								quantity: 1,
							},
					  ];

				return { cart: newCart };
			});

			get().calculateTotals();
		} catch (error) {
			handleRequestError(error, { onAuthFailMessage: "Please login to add items to cart." });
		}
	},

	/**
	 * ✅ removeFromCart now sends selectedOptions when removing a specific line.
	 * Supports:
	 * - removeFromCart(productId)  (old)
	 * - removeFromCart(cartKey)    (new)
	 */
	removeFromCart: async (idOrKey) => {
		try {
			const cart = get().cart || [];

			const target =
				cart.find((i) => i.cartKey === idOrKey) ||
				cart.find((i) => buildCartKey({ ...i, selectedOptions: normalizeSelectedOptions(i) }) === idOrKey) ||
				cart.find((i) => i._id === idOrKey);

			const productId = target?._id || idOrKey;
			const selectedOptions = target?.selectedOptions ? normalizeSelectedOptions(target.selectedOptions) : null;

			// ✅ backend supports "productId + selectedOptions" (removes only that line)
			await axios.delete(`/cart`, { data: { productId, selectedOptions } });

			set((prevState) => {
				// if we know which line: remove only that line
				if (target?.cartKey) {
					return { cart: prevState.cart.filter((item) => item.cartKey !== target.cartKey) };
				}

				// fallback: remove all lines for productId
				return { cart: prevState.cart.filter((item) => item._id !== productId) };
			});

			get().calculateTotals();
		} catch (error) {
			handleRequestError(error, { onAuthFailMessage: "Please login to update your cart." });
		}
	},

	/**
	 * ✅ updateQuantity now sends selectedOptions when updating a specific line.
	 * Supports:
	 * - updateQuantity(productId, qty) (old)
	 * - updateQuantity(cartKey, qty)   (new)
	 */
	updateQuantity: async (idOrKey, quantity) => {
		try {
			if (quantity === 0) {
				await get().removeFromCart(idOrKey);
				return;
			}

			const cart = get().cart || [];
			const target =
				cart.find((i) => i.cartKey === idOrKey) ||
				cart.find((i) => buildCartKey({ ...i, selectedOptions: normalizeSelectedOptions(i) }) === idOrKey) ||
				cart.find((i) => i._id === idOrKey);

			const productId = target?._id || idOrKey;
			const selectedOptions = target?.selectedOptions ? normalizeSelectedOptions(target.selectedOptions) : null;

			// ✅ backend supports selectedOptions to target the right line
			await axios.put(`/cart/${productId}`, { quantity, selectedOptions });

			set((prevState) => {
				if (target?.cartKey) {
					return {
						cart: prevState.cart.map((item) =>
							item.cartKey === target.cartKey ? { ...item, quantity } : item
						),
					};
				}

				return {
					cart: prevState.cart.map((item) => (item._id === productId ? { ...item, quantity } : item)),
				};
			});

			get().calculateTotals();
		} catch (error) {
			handleRequestError(error, { onAuthFailMessage: "Please login to update your cart." });
		}
	},

	calculateTotals: () => {
		const { cart, coupon } = get();

		const safeCart = Array.isArray(cart) ? cart : [];
		const subtotal = safeCart.reduce(
			(sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
			0
		);

		let total = subtotal;

		if (coupon) {
			const discount = subtotal * (coupon.discountPercentage / 100);
			total = subtotal - discount;
		}

		set({ subtotal, total });
	},
}));