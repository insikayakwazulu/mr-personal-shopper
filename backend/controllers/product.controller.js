import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";
import Product from "../models/product.model.js";

function isMongoId(id) {
	return /^[a-f\d]{24}$/i.test(String(id || ""));
}

function getCloudinaryPublicId(url) {
	// expects something like: https://res.cloudinary.com/.../image/upload/v123/products/abc123.jpg
	// returns "products/abc123"
	if (!url) return null;

	try {
		const parts = url.split("/");
		const filename = parts[parts.length - 1]; // abc123.jpg
		const folder = parts[parts.length - 2]; // products
		if (!filename || !folder) return null;

		const nameWithoutExt = filename.split(".")[0];
		return `${folder}/${nameWithoutExt}`;
	} catch {
		return null;
	}
}

async function uploadOneImageToCloudinary(imageBase64OrUrl) {
	// If admin sends a base64 string, upload it.
	// If it's already a URL, return as-is.
	if (!imageBase64OrUrl) return "";

	const str = String(imageBase64OrUrl);

	// crude check: base64 data urls usually start with "data:image/"
	if (str.startsWith("data:image/")) {
		const res = await cloudinary.uploader.upload(str, { folder: "products" });
		return res?.secure_url || "";
	}

	// If it's not base64, assume it’s a URL already
	return str;
}

async function uploadManyImagesToCloudinary(images = []) {
	const list = Array.isArray(images) ? images : [];
	const uploaded = [];

	for (const img of list) {
		const url = await uploadOneImageToCloudinary(img);
		if (url) uploaded.push(url);
	}

	return uploaded;
}

export const getAllProducts = async (req, res) => {
	try {
		const products = await Product.find({}).lean();
		return res.json({ products: products || [] });
	} catch (error) {
		console.log("Error in getAllProducts controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getFeaturedProducts = async (req, res) => {
	try {
		// ✅ If Redis is off, just fetch from MongoDB
		if (!redis) {
			const featuredProducts = await Product.find({ isFeatured: true }).lean();
			return res.json({ products: featuredProducts || [] });
		}

		// ✅ Redis on: try cache first
		const cached = await redis.get("featured_products");
		if (cached) {
			const parsed = JSON.parse(cached);
			return res.json({ products: parsed || [] });
		}

		const dbFeatured = await Product.find({ isFeatured: true }).lean();

		await redis.set("featured_products", JSON.stringify(dbFeatured || []));
		return res.json({ products: dbFeatured || [] });
	} catch (error) {
		console.log("Error in getFeaturedProducts controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

/**
 * ✅ Get single product by ID (for Product Details page)
 * GET /api/products/:id
 *
 * IMPORTANT:
 * Returns the product object directly (NOT { product })
 * so your ProductDetailsPage.jsx (setProduct(res.data)) works.
 */
export const getProductById = async (req, res) => {
	try {
		const { id } = req.params;

		if (!isMongoId(id)) {
			return res.status(400).json({ message: "Invalid product id" });
		}

		const product = await Product.findById(id).lean();
		if (!product) return res.status(404).json({ message: "Product not found" });

		// ✅ return product directly
		return res.json(product);
	} catch (error) {
		console.log("Error in getProductById controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

/**
 * ✅ Create product (admin)
 * Supports:
 * - image (required)
 * - images[] (optional, for gallery)
 * - originalPrice (optional)
 * - stockQuantity, lowStockThreshold (optional)
 * - options.colors[], options.sizes[] (optional)
 * - variants[] (optional)
 *
 * ZAR only.
 */
export const createProduct = async (req, res) => {
	try {
		const {
			name,
			description,
			price,
			originalPrice,
			image,
			images,
			category,
			stockQuantity,
			lowStockThreshold,
			options,
			variants,
		} = req.body;

		// Basic validation
		if (!name || !description || price === undefined || price === null || !image || !category) {
			return res.status(400).json({
				message: "Missing required fields: name, description, price, image, category",
			});
		}

		// Upload main image
		const mainImageUrl = await uploadOneImageToCloudinary(image);
		if (!mainImageUrl) {
			return res.status(400).json({ message: "Image upload failed" });
		}

		// Upload gallery images (optional)
		const galleryUrls = await uploadManyImagesToCloudinary(images);

		// Ensure images includes the main image first
		const finalImages = [mainImageUrl, ...galleryUrls].filter(Boolean);

		const cleanOptions = {
			colors: Array.isArray(options?.colors) ? options.colors.filter(Boolean) : [],
			sizes: Array.isArray(options?.sizes) ? options.sizes.filter(Boolean) : [],
		};

		const cleanVariants = Array.isArray(variants)
			? variants.map((v) => ({
					sku: v?.sku || "",
					color: v?.color || "",
					size: v?.size || "",
					stock: Number(v?.stock) >= 0 ? Number(v.stock) : 0,
					priceOverride:
						v?.priceOverride === null || v?.priceOverride === undefined
							? null
							: Number(v.priceOverride) >= 0
								? Number(v.priceOverride)
								: null,
			  }))
			: [];

		const product = await Product.create({
			name: String(name).trim(),
			description: String(description).trim(),
			price: Number(price),
			originalPrice:
				originalPrice === null || originalPrice === undefined || originalPrice === ""
					? null
					: Number(originalPrice),
			currency: "ZAR",
			image: mainImageUrl,
			images: finalImages,
			category: String(category).trim(),
			stockQuantity: stockQuantity === undefined || stockQuantity === null ? 0 : Number(stockQuantity),
			lowStockThreshold:
				lowStockThreshold === undefined || lowStockThreshold === null
					? 10
					: Number(lowStockThreshold),
			options: cleanOptions,
			variants: cleanVariants,
		});

		// If a featured product was created, cache may be stale; safe to refresh later via toggle.
		return res.status(201).json({ product });
	} catch (error) {
		console.log("Error in createProduct controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const deleteProduct = async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);

		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		// ✅ Delete ALL images from cloudinary (image + images[])
		const allImages = new Set();
		if (product.image) allImages.add(product.image);
		if (Array.isArray(product.images)) product.images.forEach((u) => u && allImages.add(u));

		for (const url of allImages) {
			const publicId = getCloudinaryPublicId(url);
			if (!publicId) continue;

			try {
				await cloudinary.uploader.destroy(publicId);
			} catch (err) {
				console.log("error deleting image from cloudinary", err?.message || err);
			}
		}

		await Product.findByIdAndDelete(req.params.id);

		// if featured deleted, refresh cache
		await updateFeaturedProductsCache();

		return res.json({ message: "Product deleted successfully" });
	} catch (error) {
		console.log("Error in deleteProduct controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getRecommendedProducts = async (req, res) => {
	try {
		const products = await Product.aggregate([
			{ $sample: { size: 4 } },
			{
				$project: {
					_id: 1,
					name: 1,
					description: 1,
					image: 1,
					price: 1,
					originalPrice: 1,
					stockQuantity: 1,
					currency: 1,
					category: 1,
				},
			},
		]);

		return res.json({ products: products || [] });
	} catch (error) {
		console.log("Error in getRecommendedProducts controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getProductsByCategory = async (req, res) => {
	const { category } = req.params;
	try {
		const products = await Product.find({ category }).lean();
		return res.json({ products: products || [] });
	} catch (error) {
		console.log("Error in getProductsByCategory controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const toggleFeaturedProduct = async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);
		if (product) {
			product.isFeatured = !product.isFeatured;
			const updatedProduct = await product.save();
			await updateFeaturedProductsCache();
			return res.json({ product: updatedProduct });
		} else {
			return res.status(404).json({ message: "Product not found" });
		}
	} catch (error) {
		console.log("Error in toggleFeaturedProduct controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

async function updateFeaturedProductsCache() {
	try {
		if (!redis) return;

		const featuredProducts = await Product.find({ isFeatured: true }).lean();
		await redis.set("featured_products", JSON.stringify(featuredProducts || []));
	} catch (error) {
		console.log("error in update cache function", error.message);
	}
}