import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProductCard = ({ product }) => {
	const navigate = useNavigate();

	const goToDetails = () => {
		navigate(`/product/${product._id}`);
	};

	const handleButtonClick = (e) => {
		e.stopPropagation();
		goToDetails();
	};

	const formatZar = (n) =>
		new Intl.NumberFormat("en-ZA", {
			style: "currency",
			currency: "ZAR",
			maximumFractionDigits: 0,
		}).format(Number(n || 0));

	const price = Number(product?.price || 0);
	const originalPrice =
		product?.originalPrice !== null && product?.originalPrice !== undefined
			? Number(product.originalPrice)
			: null;

	const isOnSale = originalPrice && originalPrice > price;

	const hasVariants = Array.isArray(product?.variants) && product.variants.length > 0;

	const variantStockTotal = hasVariants
		? product.variants.reduce((sum, v) => sum + (Number(v?.stock) || 0), 0)
		: 0;

	const stockQuantity = typeof product?.stockQuantity === "number" ? product.stockQuantity : null;
	const stock = hasVariants ? variantStockTotal : stockQuantity;

	const lowStockThreshold =
		typeof product?.lowStockThreshold === "number" ? product.lowStockThreshold : 10;

	const isOutOfStock = typeof stock === "number" && stock <= 0;
	const isLowStock = typeof stock === "number" && stock > 0 && stock <= lowStockThreshold;

	return (
		<div
			onClick={goToDetails}
			role='button'
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter") goToDetails();
			}}
			className='flex w-full relative flex-col overflow-hidden rounded-lg border border-gray-700 shadow-lg cursor-pointer hover:border-gray-500 transition'
		>
			<div className='relative mx-3 mt-3 flex h-60 overflow-hidden rounded-xl'>
				<img className='object-cover w-full' src={product.image} alt={product.name} />
				<div className='absolute inset-0 bg-black bg-opacity-20' />

				<div className='absolute top-3 left-3 flex flex-col gap-2'>
					{isOnSale && (
						<span className='inline-flex items-center rounded-full bg-rose-600/90 px-3 py-1 text-xs font-semibold text-white'>
							Sale
						</span>
					)}

					{isOutOfStock && (
						<span className='inline-flex items-center rounded-full bg-gray-900/80 px-3 py-1 text-xs font-semibold text-gray-200 border border-gray-700'>
							Out of stock
						</span>
					)}

					{!isOutOfStock && isLowStock && (
						<span className='inline-flex items-center rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-black'>
							Only {stock} left
						</span>
					)}
				</div>
			</div>

			<div className='mt-4 px-5 pb-5'>
				<h5 className='text-xl font-semibold tracking-tight text-white line-clamp-2'>
					{product.name}
				</h5>

				<div className='mt-2 mb-5 flex items-end justify-between gap-3'>
					<div className='flex items-end gap-3'>
						<span className='text-3xl font-bold text-emerald-400'>{formatZar(price)}</span>

						{isOnSale && (
							<span className='text-sm text-gray-400 line-through'>
								{formatZar(originalPrice)}
							</span>
						)}
					</div>

					<span className='text-xs text-gray-400'>ZAR</span>
				</div>

				<button
					type='button'
					disabled={isOutOfStock}
					onClick={handleButtonClick}
					className={`flex w-full items-center justify-center rounded-lg px-5 py-2.5 text-center text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-300 transition ${
						isOutOfStock
							? "bg-gray-700 text-gray-300 cursor-not-allowed"
							: "bg-emerald-600 text-white hover:bg-emerald-700"
					}`}
				>
					<ShoppingCart size={22} className='mr-2' />
					{isOutOfStock ? "Out of stock" : hasVariants ? "Choose Options" : "View Product"}
				</button>
			</div>
		</div>
	);
};

export default ProductCard;