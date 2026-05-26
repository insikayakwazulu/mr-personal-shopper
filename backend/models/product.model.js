import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
	{
		sku: { type: String, trim: true, default: "" },

		// For now: color + size variants (phones later)
		color: { type: String, trim: true, default: "" },
		size: { type: String, trim: true, default: "" },

		// Stock per variant
		stock: { type: Number, min: 0, default: 0 },

		// Optional: some variants might be priced differently (rare)
		priceOverride: { type: Number, min: 0, default: null },
	},
	{ _id: false }
);

const productSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		description: { type: String, required: true, trim: true },

		// ✅ Pricing
		// price = current selling price
		price: { type: Number, min: 0, required: true },

		// originalPrice = crossed-out price (optional)
		originalPrice: { type: Number, min: 0, default: null },

		// ✅ Currency (ZAR only)
		currency: {
			type: String,
			enum: ["ZAR"],
			default: "ZAR",
		},

		// ✅ Images
		// Keep your current "image" field so existing products don't break
		image: { type: String, required: [true, "Image is required"] },

		// New: multiple images for product details page
		images: {
			type: [String],
			default: [],
		},

		category: { type: String, required: true, trim: true },

		// ✅ Stock (for products with no variants)
		stockQuantity: { type: Number, min: 0, default: 0 },

		// When stockQuantity <= lowStockThreshold, frontend shows "Only X left"
		lowStockThreshold: { type: Number, min: 0, default: 10 },

		// ✅ Options (what choices exist)
		options: {
			colors: { type: [String], default: [] },
			sizes: { type: [String], default: [] },
		},

		// ✅ Variants (actual combinations + stock)
		// Example: { color: "Black", size: "M", stock: 12 }
		variants: {
			type: [variantSchema],
			default: [],
		},

		isFeatured: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

/**
 * ✅ Safety: Ensure images[] always includes image (so details page can use gallery)
 * and keep originalPrice valid (optional but if set, must be >= price).
 */
productSchema.pre("save", function (next) {
	// Keep images array synced with image
	if (this.image) {
		const list = Array.isArray(this.images) ? this.images : [];
		if (!list.includes(this.image)) {
			this.images = [this.image, ...list].filter(Boolean);
		}
	}

	// Normalize empty arrays
	if (!this.options) this.options = { colors: [], sizes: [] };
	if (!Array.isArray(this.options.colors)) this.options.colors = [];
	if (!Array.isArray(this.options.sizes)) this.options.sizes = [];
	if (!Array.isArray(this.variants)) this.variants = [];

	// If originalPrice exists and is less than price, null it (avoid weird sale UI)
	if (this.originalPrice !== null && this.originalPrice !== undefined) {
		const op = Number(this.originalPrice);
		const p = Number(this.price);
		if (!Number.isFinite(op) || op <= 0 || op <= p) {
			this.originalPrice = null;
		}
	}

	next();
});

const Product = mongoose.model("Product", productSchema);
export default Product;