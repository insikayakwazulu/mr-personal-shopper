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

	// ✅ selections
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

				// pick first image
				const imgs = Array.isArray(p?.images) && p.images.length ? p.images : [p?.image].filter(Boolean);
				setSelectedImage(imgs[0] || "");

				// default options
				const colors = Array.isArray(p?.options?.colors) ? p.options.colors : [];
				const sizes = Array.isArray(p?.options?.sizes) ? p.options.sizes : [];

				setSelectedColor(colors[0] || "");
				setSelectedSize(sizes[0] || "");
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

	const galleryImages = useMemo(() => {
		if (!product) return [];
		const imgs = Array.isArray(product.images) ? product.images : [];
		const base = product.image ? [product.image] : [];
		const merged = [...base, ...imgs].filter(Boolean);
		// remove duplicates
		return Array.from(new Set(merged));
	}, [product]);

	const price = useMemo(() => Number(product?.price || 0), [product]);
	const originalPrice = useMemo(() => {
		const v = product?.originalPrice;
		if (v === null || v === undefined) return null;
		const n = Number(v);
		return Number.isFinite(n) ? n : null;
	}, [product]);

	const isOnSale = useMemo(() => {
		return originalPrice !== null && originalPrice > price;
	}, [originalPrice, price]);

	// ✅ Stock logic:
	// - If stockQuantity exists -> use it
	// - Else if variants exist -> sum stocks
	const variantStockTotal = useMemo(() => {
		if (!Array.isArray(product?.variants)) return 0;
		return product.variants.reduce((sum, v) => sum + (Number(v?.stock) || 0), 0);
	}, [product]);

	const stock = useMemo(() => {
		if (!product) return null;
		if (typeof product.stockQuantity === "number") return product.stockQuantity;
		if (Array.isArray(product.variants) && product.variants.length) return variantStockTotal;
		return null; // unknown
	}, [product, variantStockTotal]);

	const lowStockThreshold = useMemo(() => {
		if (!product) return 10;
		return typeof product.lowStockThreshold === "number" ? product.lowStockThreshold : 10;
	}, [product]);

	const isOutOfStock = typeof stock === "number" && stock <= 0;
	const isLowStock = typeof stock === "number" && stock > 0 && stock <= lowStockThreshold;

	// ✅ Options
	const colors = useMemo(() => (Array.isArray(product?.options?.colors) ? product.options.colors : []), [product]);
	const sizes = useMemo(() => (Array.isArray(product?.options?.sizes) ? product.options.sizes : []), [product]);

	// ✅ If variants exist, show availability for the selected combo
	const selectedVariant = useMemo(() => {
		if (!Array.isArray(product?.variants) || product.variants.length === 0) return null;

		// match by provided fields (color/size may be empty if product doesn't use them)
		return (
			product.variants.find((v) => {
				const cOk = selectedColor ? (v?.color || "").toLowerCase() === selectedColor.toLowerCase() : true;
				const sOk = selectedSize ? (v?.size || "").toLowerCase() === selectedSize.toLowerCase() : true;
				return cOk && sOk;
			}) || null
		);
	}, [product, selectedColor, selectedSize]);

	const variantStock = useMemo(() => {
		if (!selectedVariant) return null;
		return Number(selectedVariant.stock ?? 0);
	}, [selectedVariant]);

	const effectivePrice = useMemo(() => {
		if (!product) return 0;
		const override = selectedVariant?.priceOverride;
		if (override !== null && override !== undefined) {
			const n = Number(override);
			if (Number.isFinite(n) && n >= 0) return n;
		}
		return price;
	}, [product, selectedVariant, price]);

	const canAddToCart = useMemo(() => {
		// if variant exists, must have stock > 0
		if (selectedVariant) return (variantStock ?? 0) > 0;
		// else use product-level stock if present
		if (typeof stock === "number") return stock > 0;
		// unknown stock -> allow
		return true;
	}, [selectedVariant, variantStock, stock]);

	const handleAddToCart = () => {
		if (!user) {
			toast.error("Please login to add products to cart", { id: "login" });
			return;
		}

		if (!canAddToCart) {
			toast.error("This item is out of stock.");
			return;
		}

		// ✅ Keep your current cart model working:
		// We pass extra fields, but if backend ignores them, it won’t break.
		const payload = {
			...product,
			selectedOptions: {
				color: selectedColor || "",
				size: selectedSize || "",
				variantSku: selectedVariant?.sku || "",
			},
		};

		addToCart(payload);
	};

	if (loading) return <div className="p-6 text-gray-300">Loading product...</div>;
	if (error) return <div className="p-6 text-red-400">{error}</div>;
	if (!product) return <div className="p-6 text-red-400">Product not found.</div>;

	return (
		<div className="min-h-screen">
			<div className="relative z-10 max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
				<div className="mb-6">
					<Link to="/" className="text-emerald-400 hover:text-emerald-300 underline">
						← Back to Home
					</Link>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* ✅ Image gallery */}
					<div className="rounded-2xl border border-gray-700 bg-gray-800 overflow-hidden p-4">
						<div className="rounded-xl overflow-hidden border border-gray-700">
							<img
								src={selectedImage || product.image}
								alt={product.name}
								className="w-full h-[420px] object-cover"
							/>
						</div>

						{galleryImages.length > 1 && (
							<div className="mt-4 grid grid-cols-4 gap-3">
								{galleryImages.slice(0, 8).map((img) => {
									const active = img === selectedImage;
									return (
										<button
											key={img}
											type="button"
											onClick={() => setSelectedImage(img)}
											className={`rounded-lg overflow-hidden border transition ${
												active ? "border-emerald-500" : "border-gray-700 hover:border-gray-500"
											}`}
										>
											<img src={img} alt="thumb" className="w-full h-20 object-cover" />
										</button>
									);
								})}
							</div>
						)}
					</div>

					{/* ✅ Details */}
					<div className="rounded-2xl border border-gray-700 bg-gray-800 p-6">
						<div className="flex items-start justify-between gap-4">
							<h1 className="text-3xl font-bold text-white">{product.name}</h1>

							{/* Stock badge */}
							{isOutOfStock && (
								<span className="shrink-0 inline-flex items-center rounded-full bg-gray-900/80 px-3 py-1 text-xs font-semibold text-gray-200 border border-gray-700">
									Out of stock
								</span>
							)}
							{!isOutOfStock && isLowStock && (
								<span className="shrink-0 inline-flex items-center rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-black">
									Only {stock} left
								</span>
							)}
							{!isOutOfStock && !isLowStock && typeof stock === "number" && (
								<span className="shrink-0 inline-flex items-center rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white">
									In stock
								</span>
							)}
						</div>

						<p className="text-gray-300 mt-3 mb-5">{product.description}</p>

						{/* Pricing */}
						<div className="flex items-end gap-3 mb-6">
							<span className="text-4xl font-extrabold text-emerald-400">
								{formatZar(effectivePrice)}
							</span>

							{isOnSale && (
								<span className="text-lg text-gray-400 line-through">{formatZar(originalPrice)}</span>
							)}

							<span className="text-sm text-gray-400 mb-1">ZAR</span>
						</div>

						<div className="text-sm text-gray-400 mb-6">
							Category: <span className="text-gray-200">{product.category}</span>
						</div>

						{/* ✅ Options (colors/sizes) */}
						<div className="space-y-5 mb-6">
							{colors.length > 0 && (
								<div>
									<p className="text-sm text-gray-300 mb-2">Color</p>
									<div className="flex flex-wrap gap-2">
										{colors.map((c) => {
											const active = c === selectedColor;
											return (
												<button
													key={c}
													type="button"
													onClick={() => setSelectedColor(c)}
													className={`px-3 py-2 rounded-lg border text-sm transition ${
														active
															? "border-emerald-500 bg-emerald-600/15 text-emerald-200"
															: "border-gray-700 hover:border-gray-500 text-gray-200"
													}`}
												>
													{c}
												</button>
											);
										})}
									</div>
								</div>
							)}

							{sizes.length > 0 && (
								<div>
									<p className="text-sm text-gray-300 mb-2">Size</p>
									<div className="flex flex-wrap gap-2">
										{sizes.map((s) => {
											const active = s === selectedSize;
											return (
												<button
													key={s}
													type="button"
													onClick={() => setSelectedSize(s)}
													className={`px-3 py-2 rounded-lg border text-sm transition ${
														active
															? "border-emerald-500 bg-emerald-600/15 text-emerald-200"
															: "border-gray-700 hover:border-gray-500 text-gray-200"
													}`}
												>
													{s}
												</button>
											);
										})}
									</div>
								</div>
							)}

							{/* Variant availability */}
							{selectedVariant && (
								<div className="text-sm text-gray-400">
									Selected variant stock:{" "}
									<span className="text-gray-200 font-semibold">
										{variantStock ?? 0}
									</span>
								</div>
							)}
						</div>

						<button
							onClick={handleAddToCart}
							disabled={!canAddToCart}
							className={`w-full flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold
							focus:outline-none focus:ring-4 focus:ring-emerald-300 transition
							${!canAddToCart ? "bg-gray-700 text-gray-300 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
						>
							<ShoppingCart size={18} />
							{!canAddToCart ? "Out of stock" : "Add to cart"}
						</button>

						<p className="text-xs text-gray-500 mt-4">
							Note: Variants/stock will show as you add them in Admin when we upgrade the product create form.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ProductDetailsPage;