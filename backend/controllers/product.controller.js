import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";
import Product from "../models/product.model.js";

function isMongoId(id) {
	return /^[a-f\d]{24}$/i.test(String(id || ""));
}

function getCloudinaryPublicId(url) {
	if (!url) return null;

	try {
		const parts = url.split("/");
		const filename = parts[parts.length - 1];
		const folder = parts[parts.length - 2];
		if (!filename || !folder) return null;

		const nameWithoutExt = filename.split(".")[0];
		return `${folder}/${nameWithoutExt}`;
	} catch {
		return null;
	}
}

async function uploadOneImageToCloudinary(imageBase64OrUrl) {
	if (!imageBase64OrUrl) return "";

	const str = String(imageBase64OrUrl);

	if (str.startsWith("data:image/")) {
		const res = await cloudinary.uploader.upload(str, { folder: "products" });
		return res?.secure_url || "";
	}

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

async function cleanVariantsWithUploadedImages(variants = []) {
	if (!Array.isArray(variants)) return [];

	const cleanVariants = [];

	for (const v of variants) {
		const variantImages = await uploadManyImagesToCloudinary(v?.images || []);

		cleanVariants.push({
			sku: v?.sku || "",
			color: v?.color || "",
			size: v?.size || "",
			stock: Number(v?.stock) >= 0 ? Number(v.stock) : 0,
			images: variantImages,
			priceOverride:
				v?.priceOverride === null || v?.priceOverride === undefined || v?.priceOverride === ""
					? null
					: Number(v.priceOverride) >= 0
						? Number(v.priceOverride)
						: null,
		});
	}

	return cleanVariants;
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
		if (!redis) {
			const featuredProducts = await Product.find({ isFeatured: true }).lean();
			return res.json({ products: featuredProducts || [] });
		}

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

export const getProductById = async (req, res) => {
	try {
		const { id } = req.params;

		if (!isMongoId(id)) {
			return res.status(400).json({ message: "Invalid product id" });
		}

		const product = await Product.findById(id).lean();
		if (!product) return res.status(404).json({ message: "Product not found" });

		return res.json(product);
	} catch (error) {
		console.log("Error in getProductById controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

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

		if (!name || !description || price === undefined || price === null || !image || !category) {
			return res.status(400).json({
				message: "Missing required fields: name, description, price, image, category",
			});
		}

		const mainImageUrl = await uploadOneImageToCloudinary(image);

		if (!mainImageUrl) {
			return res.status(400).json({ message: "Image upload failed" });
		}

		const galleryUrls = await uploadManyImagesToCloudinary(images);
		const finalImages = [mainImageUrl, ...galleryUrls].filter(Boolean);

		const cleanOptions = {
			colors: Array.isArray(options?.colors) ? options.colors.filter(Boolean) : [],
			sizes: Array.isArray(options?.sizes) ? options.sizes.filter(Boolean) : [],
		};

		const cleanVariants = await cleanVariantsWithUploadedImages(variants);

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

		const allImages = new Set();

		if (product.image) allImages.add(product.image);
		if (Array.isArray(product.images)) product.images.forEach((u) => u && allImages.add(u));

		if (Array.isArray(product.variants)) {
			product.variants.forEach((variant) => {
				if (Array.isArray(variant.images)) {
					variant.images.forEach((u) => u && allImages.add(u));
				}
			});
		}

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
					variants: 1,
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
		}

		return res.status(404).json({ message: "Product not found" });
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