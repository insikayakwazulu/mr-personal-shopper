

import { Minus, Plus, Trash } from "lucide-react";
import { useCartStore } from "../stores/useCartStore";

const CartItem = ({ item }) => {
	const { removeFromCart, updateQuantity } = useCartStore();

	// ✅ ZAR formatting
	const formatZar = (n) =>
		new Intl.NumberFormat("en-ZA", {
			style: "currency",
			currency: "ZAR",
			maximumFractionDigits: 0,
		}).format(Number(n || 0));

	// ✅ Show chosen options (from ProductDetailsPage payload)
	const selectedColor =
		item?.selectedOptions?.color ||
		item?.selectedOptions?.selectedColor || // fallback if older naming
		"";

	const selectedSize =
		item?.selectedOptions?.size ||
		item?.selectedOptions?.selectedSize || // fallback if older naming
		"";

	const selectedVariantSku = item?.selectedOptions?.variantSku || "";

	const hasSelections = Boolean(selectedColor || selectedSize || selectedVariantSku);

	// ✅ IMPORTANT: identify the cart line by cartKey when present (variant-safe)
	const lineId = item?.cartKey || item?._id;

	return (
		<div className='rounded-lg border p-4 shadow-sm border-gray-700 bg-gray-800 md:p-6'>
			<div className='space-y-4 md:flex md:items-center md:justify-between md:gap-6 md:space-y-0'>
				<div className='shrink-0 md:order-1'>
					<img className='h-20 md:h-32 rounded object-cover' src={item.image} alt={item.name} />
				</div>

				<label className='sr-only'>Choose quantity:</label>

				<div className='flex items-center justify-between md:order-3 md:justify-end'>
					<div className='flex items-center gap-2'>
						<button
							className='inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border
							 border-gray-600 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2
							  focus:ring-emerald-500'
							onClick={() => updateQuantity(lineId, item.quantity - 1)}
						>
							<Minus className='text-gray-300' />
						</button>

						<p>{item.quantity}</p>

						<button
							className='inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border
							 border-gray-600 bg-gray-700 hover:bg-gray-600 focus:outline-none
						focus:ring-2 focus:ring-emerald-500'
							onClick={() => updateQuantity(lineId, item.quantity + 1)}
						>
							<Plus className='text-gray-300' />
						</button>
					</div>

					<div className='text-end md:order-4 md:w-40'>
						<p className='text-base font-bold text-emerald-400'>{formatZar(item.price)}</p>
						<p className='text-xs text-gray-400'>ZAR</p>
					</div>
				</div>

				<div className='w-full min-w-0 flex-1 space-y-3 md:order-2 md:max-w-md'>
					<p className='text-base font-medium text-white hover:text-emerald-400 hover:underline'>
						{item.name}
					</p>

					{/* ✅ Selected options shown clearly */}
					{hasSelections && (
						<div className='flex flex-wrap gap-2'>
							{selectedColor && (
								<span className='inline-flex items-center rounded-full bg-gray-900 border border-gray-700 px-3 py-1 text-xs text-gray-200'>
									Color: <span className='ml-1 font-semibold text-white'>{selectedColor}</span>
								</span>
							)}
							{selectedSize && (
								<span className='inline-flex items-center rounded-full bg-gray-900 border border-gray-700 px-3 py-1 text-xs text-gray-200'>
									Size: <span className='ml-1 font-semibold text-white'>{selectedSize}</span>
								</span>
							)}
							{selectedVariantSku && (
								<span className='inline-flex items-center rounded-full bg-gray-900 border border-gray-700 px-3 py-1 text-xs text-gray-200'>
									SKU: <span className='ml-1 font-semibold text-white'>{selectedVariantSku}</span>
								</span>
							)}
						</div>
					)}

					<p className='text-sm text-gray-400 line-clamp-2'>{item.description}</p>

					<div className='flex items-center gap-4'>
						<button
							className='inline-flex items-center text-sm font-medium text-red-400
							 hover:text-red-300 hover:underline'
							onClick={() => removeFromCart(lineId)}
						>
							<Trash className='mr-2' />
							Remove
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CartItem;