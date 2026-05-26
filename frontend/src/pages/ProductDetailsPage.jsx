import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";

const ProductDetailsPage = () => {
	const { id } = useParams();
	const { user } = useUserStore();
	const { addToCart } = useCartStore();

	const [product, setProduct] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const [selectedImage, setSelectedImage] = useState("");
	const [selectedColor, setSelectedColor] = useState("");
	const [selectedSize, setSelectedSize] = useState("");

	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				setError("");

				const res = await axios.get(`/products/${id}`);
				const p = res?.data?.product || res?.data;

				setProduct(p);

				const variants = Array.isArray(p?.variants) ? p.variants : [];
				const firstInStockVariant = variants.find((v) => Number(v?.stock || 0) > 0);
				const firstVariant = firstInStockVariant || variants[0];

				const colors = getUnique(variants.map((v) => v.color).filter(Boolean));
				const sizes = getUnique(variants.map((v) => v.size).filter(Boolean));

				setSelectedColor(firstVariant?.color || colors[0] || "");
				setSelectedSize(firstVariant?.size || sizes[0] || "");

				const firstImages =
					Array.isArray(firstVariant?.images) && firstVariant.images.length
						? firstVariant.images
						: Array.isArray(p?.images) && p.images.length
							? p.images
							: [p?.image].filter(Boolean);

				setSelectedImage(firstImages[0] || "");
			} catch (e) {
				console.error("Failed to load product:", e);
				setError(e?.response?.data?.message || "Product not found.");
			} finally {
				setLoading(false);
			}
		})();
	}, [id]);

	const formatZar = (n) =>
		new Intl.NumberFormat("en-ZA", {
			style: "currency",
			currency: "ZAR",
			maximumFractionDigits: 0,
		}).format(Number(n || 0));

	const variants = useMemo(() => {
		return Array.isArray(product?.variants) ? product.variants : [];
	}, [product]);

	const hasVariants = variants.length > 0;

	const colors = useMemo(() => {
		if (hasVariants) return getUnique(variants.map((v) => v.color).filter(Boolean));
		return Array.isArray(product?.options?.colors) ? product.options.colors : [];
	}, [hasVariants, variants, product]);

	const sizesForSelectedColor = useMemo(() => {
		if (hasVariants) {
			return getUnique(
				variants
					.filter((v) => {
						if (!selectedColor) return true;
						return same(v.color, selectedColor);
					})
					.map((v) => v.size)
					.filter(Boolean)
			);
		}

		return Array.isArray(product?.options?.sizes) ? product.options.sizes : [];
	}, [hasVariants, variants, selectedColor, product]);

	const selectedVariant = useMemo(() => {
		if (!hasVariants) return null;

		return (
			variants.find((v) => {
				const cOk = selectedColor ? same(v.color, selectedColor) : true;
				const sOk = selectedSize ? same(v.size, selectedSize) : true;
				return cOk && sOk;
			}) || null
		);
	}, [hasVariants, variants, selectedColor, selectedSize]);

	const galleryImages = useMemo(() => {
		if (!product) return [];

		const variantImages =
			selectedVariant && Array.isArray(selectedVariant.images) ? selectedVariant.images : [];

		const productImages = Array.isArray(product.images) ? product.images : [];
		const base = product.image ? [product.image] : [];

		const merged = variantImages.length ? variantImages : [...base, ...productImages];

		return Array.from(new Set(merged.filter(Boolean)));
	}, [product, selectedVariant]);

	useEffect(() => {
		if (galleryImages.length > 0) {
			setSelectedImage(galleryImages[0]);
		}
	}, [selectedColor, selectedSize, galleryImages]);

	const price = useMemo(() => Number(product?.price || 0), [product]);

	const effectivePrice = useMemo(() => {
		const override = selectedVariant?.priceOverride;
		if (override !== null && override !== undefined && override !== "") {
			const n = Number(override);
			if (Number.isFinite(n) && n >= 0) return n;
		}
		return price;
	}, [selectedVariant, price]);

	const originalPrice = useMemo(() => {
		const v = product?.originalPrice;
		if (v === null || v === undefined) return null;
		const n = Number(v);
		return Number.isFinite(n) ? n : null;
	}, [product]);

	const isOnSale = originalPrice !== null && originalPrice > effectivePrice;

	const variantStock = selectedVariant ? Number(selectedVariant.stock || 0) : null;

	const variantStockTotal = useMemo(() => {
		return variants.reduce((sum, v) => sum + (Number(v?.stock) || 0), 0);
	}, [variants]);

	const stock = useMemo(() => {
		if (!product) return null;
		if (selectedVariant) return variantStock;
		if (hasVariants) return variantStockTotal;
		if (typeof product.stockQuantity === "number") return product.stockQuantity;
		return null;
	}, [product, selectedVariant, variantStock, hasVariants, variantStockTotal]);

	const lowStockThreshold =
		typeof product?.lowStockThreshold === "number" ? product.lowStockThreshold : 10;

	const isOutOfStock = typeof stock === "number" && stock <= 0;
	const isLowStock = typeof stock === "number" && stock > 0 && stock <= lowStockThreshold;

	const colorStockMap = useMemo(() => {
		const map = {};
		for (const c of colors) {
			const total = variants
				.filter((v) => same(v.color, c))
				.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
			map[c] = total;
		}
		return map;
	}, [colors, variants]);

	const sizeStockMap = useMemo(() => {
		const map = {};
		for (const s of sizesForSelectedColor) {
			const total = variants
				.filter((v) => {
					const cOk = selectedColor ? same(v.color, selectedColor) : true;
					return cOk && same(v.size, s);
				})
				.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
			map[s] = total;
		}
		return map;
	}, [sizesForSelectedColor, variants, selectedColor]);

	useEffect(() => {
		if (!hasVariants) return;
		if (!selectedColor) return;

		const availableSizes = variants
			.filter((v) => same(v.color, selectedColor))
			.map((v) => v.size)
			.filter(Boolean);

		if (availableSizes.length && !availableSizes.some((s) => same(s, selectedSize))) {
			const firstInStock = variants.find((v) => same(v.color, selectedColor) && Number(v.stock || 0) > 0);
			setSelectedSize(firstInStock?.size || availableSizes[0] || "");
		}
	}, [selectedColor, hasVariants, variants, selectedSize]);

	const canAddToCart = useMemo(() => {
		if (hasVariants) {
			return Boolean(selectedVariant) && Number(selectedVariant.stock || 0) > 0;
		}

		if (typeof stock === "number") return stock > 0;
		return true;
	}, [hasVariants, selectedVariant, stock]);

	const handleAddToCart = () => {
		if (!user) {
			toast.error("Please login to add products to cart", { id: "login" });
			return;
		}

		if (!canAddToCart) {
			toast.error("This exact option is out of stock.");
			return;
		}

		const payload = {
			...product,
			price: effectivePrice,
			image: selectedImage || product.image,
			selectedOptions: {
				color: selectedColor || "",
				size: selectedSize || "",
				variantSku: selectedVariant?.sku || "",
			},
			selectedVariantStock: selectedVariant?.stock ?? null,
		};

		addToCart(payload);
	};

	if (loading) return <div className='p-6 text-gray-300'>Loading product...</div>;
	if (error) return <div className='p-6 text-red-400'>{error}</div>;
	if (!product) return <div className='p-6 text-red-400'>Product not found.</div>;

	return (
		<div className='min-h-screen'>
			<div className='relative z-10 max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10'>
				<div className='mb-6'>
					<Link to='/' className='text-emerald-400 hover:text-emerald-300 underline'>
						← Back to Home
					</Link>
				</div>

				<div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
					<div className='rounded-2xl border border-gray-700 bg-gray-800 overflow-hidden p-4'>
						<div className='rounded-xl overflow-hidden border border-gray-700'>
							<img
								src={selectedImage || product.image}
								alt={product.name}
								className='w-full h-[320px] sm:h-[420px] object-cover'
							/>
						</div>

						{galleryImages.length > 1 && (
							<div className='mt-4 grid grid-cols-4 gap-3'>
								{galleryImages.slice(0, 8).map((img) => {
									const active = img === selectedImage;
									return (
										<button
											key={img}
											type='button'
											onClick={() => setSelectedImage(img)}
											className={`rounded-lg overflow-hidden border transition ${
												active ? "border-emerald-500" : "border-gray-700 hover:border-gray-500"
											}`}
										>
											<img src={img} alt='thumb' className='w-full h-20 object-cover' />
										</button>
									);
								})}
							</div>
						)}
					</div>

					<div className='rounded-2xl border border-gray-700 bg-gray-800 p-6'>
						<div className='flex items-start justify-between gap-4'>
							<h1 className='text-3xl font-bold text-white'>{product.name}</h1>
							<StockBadge isOutOfStock={isOutOfStock} isLowStock={isLowStock} stock={stock} />
						</div>

						<p className='text-gray-300 mt-3 mb-5'>{product.description}</p>

						<div className='flex items-end gap-3 mb-6'>
							<span className='text-4xl font-extrabold text-emerald-400'>
								{formatZar(effectivePrice)}
							</span>

							{isOnSale && (
								<span className='text-lg text-gray-400 line-through'>{formatZar(originalPrice)}</span>
							)}

							<span className='text-sm text-gray-400 mb-1'>ZAR</span>
						</div>

						<div className='text-sm text-gray-400 mb-6'>
							Category: <span className='text-gray-200'>{product.category}</span>
						</div>

						<div className='space-y-5 mb-6'>
							{colors.length > 0 && (
								<div>
									<p className='text-sm text-gray-300 mb-2'>Color</p>
									<div className='flex flex-wrap gap-2'>
										{colors.map((c) => {
											const active = same(c, selectedColor);
											const colorOut = hasVariants && Number(colorStockMap[c] || 0) <= 0;

											return (
												<button
													key={c}
													type='button'
													onClick={() => {
														setSelectedColor(c);
														const firstInStock = variants.find(
															(v) => same(v.color, c) && Number(v.stock || 0) > 0
														);
														const firstAny = variants.find((v) => same(v.color, c));
														setSelectedSize(firstInStock?.size || firstAny?.size || "");
													}}
													disabled={colorOut}
													className={`px-3 py-2 rounded-lg border text-sm transition relative ${
														active
															? "border-emerald-500 bg-emerald-600/15 text-emerald-200"
															: "border-gray-700 hover:border-gray-500 text-gray-200"
													} ${colorOut ? "opacity-45 cursor-not-allowed line-through" : ""}`}
												>
													{c}
													{colorOut && <span className='ml-2 text-xs'>(Out)</span>}
												</button>
											);
										})}
									</div>
								</div>
							)}

							{sizesForSelectedColor.length > 0 && (
								<div>
									<p className='text-sm text-gray-300 mb-2'>Size</p>
									<div className='flex flex-wrap gap-2'>
										{sizesForSelectedColor.map((s) => {
											const active = same(s, selectedSize);
											const sizeOut = hasVariants && Number(sizeStockMap[s] || 0) <= 0;

											return (
												<button
													key={s}
													type='button'
													onClick={() => setSelectedSize(s)}
													disabled={sizeOut}
													className={`px-3 py-2 rounded-lg border text-sm transition ${
														active
															? "border-emerald-500 bg-emerald-600/15 text-emerald-200"
															: "border-gray-700 hover:border-gray-500 text-gray-200"
													} ${sizeOut ? "opacity-45 cursor-not-allowed line-through" : ""}`}
												>
													{s}
													{sizeOut && <span className='ml-2 text-xs'>(Out)</span>}
												</button>
											);
										})}
									</div>
								</div>
							)}

							{selectedVariant && (
								<div className='rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm text-gray-300'>
									Selected:{" "}
									<span className='text-white font-semibold'>
										{selectedColor || "-"} / {selectedSize || "-"}
									</span>
									{" • "}
									Stock:{" "}
									<span className={variantStock > 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
										{variantStock}
									</span>
									{selectedVariant?.sku && (
										<>
											{" • "}
											SKU: <span className='text-gray-200'>{selectedVariant.sku}</span>
										</>
									)}
								</div>
							)}
						</div>

						<button
							onClick={handleAddToCart}
							disabled={!canAddToCart}
							className={`w-full flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-300 transition ${
								!canAddToCart
									? "bg-gray-700 text-gray-300 cursor-not-allowed"
									: "bg-emerald-600 text-white hover:bg-emerald-700"
							}`}
						>
							<ShoppingCart size={18} />
							{!canAddToCart ? "Out of stock" : "Add to cart"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

const StockBadge = ({ isOutOfStock, isLowStock, stock }) => {
	if (isOutOfStock) {
		return (
			<span className='shrink-0 inline-flex items-center rounded-full bg-gray-900/80 px-3 py-1 text-xs font-semibold text-gray-200 border border-gray-700'>
				Out of stock
			</span>
		);
	}

	if (isLowStock) {
		return (
			<span className='shrink-0 inline-flex items-center rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-black'>
				Only {stock} left
			</span>
		);
	}

	if (typeof stock === "number") {
		return (
			<span className='shrink-0 inline-flex items-center rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white'>
				In stock
			</span>
		);
	}

	return null;
};

const same = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();

const getUnique = (list) => Array.from(new Set((list || []).filter(Boolean)));

export default ProductDetailsPage;