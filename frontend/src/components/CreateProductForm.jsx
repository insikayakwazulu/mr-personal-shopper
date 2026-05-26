import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PlusCircle, Upload, Loader, X, Plus } from "lucide-react";
import { useProductStore } from "../stores/useProductStore";
import toast from "react-hot-toast";

const categories = ["jeans", "t-shirts", "shoes", "glasses", "jackets", "suits", "bags", "phones"];

const emptyVariant = {
	sku: "",
	color: "",
	size: "",
	stock: "",
	priceOverride: "",
	images: [],
};

const CreateProductForm = () => {
	const { createProduct, loading } = useProductStore();

	const [newProduct, setNewProduct] = useState({
		name: "",
		description: "",
		price: "",
		originalPrice: "",
		category: "",
		image: "",
		images: [],
		stockQuantity: "",
		lowStockThreshold: "10",
		options: { colors: [], sizes: [] },
		variants: [],
		currency: "ZAR",
	});

	const canSubmit = useMemo(() => {
		if (!newProduct.name.trim()) return false;
		if (!newProduct.description.trim()) return false;
		if (!String(newProduct.price).trim()) return false;
		if (!newProduct.category.trim()) return false;
		if (!newProduct.image) return false;
		return true;
	}, [newProduct]);

	const resetForm = () => {
		setNewProduct({
			name: "",
			description: "",
			price: "",
			originalPrice: "",
			category: "",
			image: "",
			images: [],
			stockQuantity: "",
			lowStockThreshold: "10",
			options: { colors: [], sizes: [] },
			variants: [],
			currency: "ZAR",
		});
	};

	const readFilesAsBase64 = (files, callback) => {
		const list = Array.from(files || []);
		if (!list.length) return;

		const readNext = (index, collected) => {
			if (index >= list.length) {
				callback(collected);
				return;
			}

			const reader = new FileReader();
			reader.onloadend = () => readNext(index + 1, [...collected, reader.result]);
			reader.readAsDataURL(list[index]);
		};

		readNext(0, []);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!canSubmit) {
			toast.error("Please fill all required fields.");
			return;
		}

		const cleanVariants = newProduct.variants
			.filter((v) => v.color.trim() || v.size.trim() || String(v.stock).trim())
			.map((v) => ({
				sku: v.sku.trim(),
				color: v.color.trim(),
				size: v.size.trim(),
				stock: Number(v.stock) || 0,
				priceOverride:
					v.priceOverride === "" || v.priceOverride === null
						? null
						: Number(v.priceOverride) || null,
				images: Array.isArray(v.images) ? v.images : [],
			}));

		const colors = Array.from(new Set(cleanVariants.map((v) => v.color).filter(Boolean)));
		const sizes = Array.from(new Set(cleanVariants.map((v) => v.size).filter(Boolean)));

		const payload = {
			name: newProduct.name.trim(),
			description: newProduct.description.trim(),
			category: newProduct.category.trim(),
			currency: "ZAR",
			price: Number(newProduct.price) || 0,
			originalPrice:
				newProduct.originalPrice === "" || newProduct.originalPrice === null
					? null
					: Number(newProduct.originalPrice) || null,
			image: newProduct.image,
			images: Array.isArray(newProduct.images) ? newProduct.images : [],
			stockQuantity: newProduct.stockQuantity === "" ? 0 : Number(newProduct.stockQuantity) || 0,
			lowStockThreshold:
				newProduct.lowStockThreshold === "" ? 10 : Number(newProduct.lowStockThreshold) || 10,
			options: { colors, sizes },
			variants: cleanVariants,
		};

		try {
			await createProduct(payload);
			toast.success("Product created!");
			resetForm();
		} catch (err) {
			console.log("error creating a product", err);
			toast.error("Failed to create product.");
		}
	};

	const handleMainImageChange = (e) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onloadend = () => {
			setNewProduct((p) => ({ ...p, image: reader.result }));
		};
		reader.readAsDataURL(file);
	};

	const handleExtraImagesChange = (e) => {
		readFilesAsBase64(e.target.files, (images) => {
			setNewProduct((p) => ({ ...p, images: [...(p.images || []), ...images] }));
		});
	};

	const removeExtraImage = (idx) => {
		setNewProduct((p) => ({
			...p,
			images: (p.images || []).filter((_, i) => i !== idx),
		}));
	};

	const addVariant = () => {
		setNewProduct((p) => ({
			...p,
			variants: [...(p.variants || []), { ...emptyVariant }],
		}));
	};

	const updateVariant = (idx, field, value) => {
		setNewProduct((p) => ({
			...p,
			variants: (p.variants || []).map((v, i) => (i === idx ? { ...v, [field]: value } : v)),
		}));
	};

	const removeVariant = (idx) => {
		setNewProduct((p) => ({
			...p,
			variants: (p.variants || []).filter((_, i) => i !== idx),
		}));
	};

	const handleVariantImagesChange = (idx, files) => {
		readFilesAsBase64(files, (images) => {
			setNewProduct((p) => ({
				...p,
				variants: (p.variants || []).map((v, i) =>
					i === idx ? { ...v, images: [...(v.images || []), ...images] } : v
				),
			}));
		});
	};

	const removeVariantImage = (variantIdx, imageIdx) => {
		setNewProduct((p) => ({
			...p,
			variants: (p.variants || []).map((v, i) =>
				i === variantIdx
					? { ...v, images: (v.images || []).filter((_, imgI) => imgI !== imageIdx) }
					: v
			),
		}));
	};

	return (
		<motion.div
			className='bg-gray-800 shadow-lg rounded-lg p-5 sm:p-8 mb-8 max-w-4xl mx-auto'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.8 }}
		>
			<h2 className='text-2xl font-semibold mb-6 text-emerald-300'>Create New Product</h2>

			<form onSubmit={handleSubmit} className='space-y-5'>
				<div>
					<label className='block text-sm font-medium text-gray-300'>Product Name *</label>
					<input
						value={newProduct.name}
						onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
						className='mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500'
						required
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-300'>Description *</label>
					<textarea
						value={newProduct.description}
						onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
						rows='3'
						className='mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500'
						required
					/>
				</div>

				<div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
					<div>
						<label className='block text-sm font-medium text-gray-300'>Price (ZAR) *</label>
						<input
							type='number'
							value={newProduct.price}
							onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
							step='0.01'
							min='0'
							className='mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500'
							required
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-300'>Original Price</label>
						<input
							type='number'
							value={newProduct.originalPrice}
							onChange={(e) => setNewProduct((p) => ({ ...p, originalPrice: e.target.value }))}
							step='0.01'
							min='0'
							className='mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500'
						/>
					</div>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-300'>Category *</label>
					<select
						value={newProduct.category}
						onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}
						className='mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500'
						required
					>
						<option value=''>Select a category</option>
						{categories.map((category) => (
							<option key={category} value={category}>
								{category}
							</option>
						))}
					</select>
				</div>

				<div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
					<div>
						<label className='block text-sm font-medium text-gray-300'>Fallback Stock Quantity</label>
						<input
							type='number'
							value={newProduct.stockQuantity}
							onChange={(e) => setNewProduct((p) => ({ ...p, stockQuantity: e.target.value }))}
							min='0'
							className='mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500'
							placeholder='Used only if no variants exist'
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-300'>Low Stock Threshold</label>
						<input
							type='number'
							value={newProduct.lowStockThreshold}
							onChange={(e) => setNewProduct((p) => ({ ...p, lowStockThreshold: e.target.value }))}
							min='0'
							className='mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500'
						/>
					</div>
				</div>

				<div className='rounded-xl border border-gray-700 bg-gray-900 p-4'>
					<p className='text-lg font-semibold text-emerald-300 mb-2'>Variant Stock & Images</p>
					<p className='text-sm text-gray-400 mb-4'>
						Add exact combinations like Black / Small, Black / Medium, White / Small. Each can have its own stock and images.
					</p>

					<div className='space-y-4'>
						{(newProduct.variants || []).map((variant, idx) => (
							<div key={idx} className='rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-3'>
								<div className='flex items-center justify-between gap-3'>
									<p className='text-sm font-semibold text-white'>Variant #{idx + 1}</p>
									<button
										type='button'
										onClick={() => removeVariant(idx)}
										className='text-red-400 hover:text-red-300'
									>
										<X size={18} />
									</button>
								</div>

								<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3'>
									<Input label='Color' value={variant.color} onChange={(v) => updateVariant(idx, "color", v)} placeholder='Black' />
									<Input label='Size' value={variant.size} onChange={(v) => updateVariant(idx, "size", v)} placeholder='M' />
									<Input label='Stock' type='number' value={variant.stock} onChange={(v) => updateVariant(idx, "stock", v)} placeholder='5' />
									<Input label='SKU' value={variant.sku} onChange={(v) => updateVariant(idx, "sku", v)} placeholder='BLK-M' />
									<Input label='Price Override' type='number' value={variant.priceOverride} onChange={(v) => updateVariant(idx, "priceOverride", v)} placeholder='Optional' />
								</div>

								<div>
									<input
										type='file'
										id={`variant-images-${idx}`}
										className='sr-only'
										accept='image/*'
										multiple
										onChange={(e) => handleVariantImagesChange(idx, e.target.files)}
									/>

									<label
										htmlFor={`variant-images-${idx}`}
										className='inline-flex cursor-pointer items-center rounded-md bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600'
									>
										<Upload className='h-4 w-4 mr-2' />
										Add Images For This Variant
									</label>

									{variant.images?.length > 0 && (
										<div className='mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3'>
											{variant.images.map((src, imageIdx) => (
												<div key={imageIdx} className='relative rounded-lg overflow-hidden border border-gray-700'>
													<img src={src} alt='Variant preview' className='w-full h-24 object-cover' />
													<button
														type='button'
														onClick={() => removeVariantImage(idx, imageIdx)}
														className='absolute top-2 right-2 bg-black/70 text-white rounded-full p-1'
													>
														<X size={14} />
													</button>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						))}
					</div>

					<button
						type='button'
						onClick={addVariant}
						className='mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700'
					>
						<Plus size={16} />
						Add Variant
					</button>
				</div>

				<div>
					<p className='block text-sm font-medium text-gray-300 mb-2'>Main Image *</p>
					<input type='file' id='image' className='sr-only' accept='image/*' onChange={handleMainImageChange} />
					<label htmlFor='image' className='cursor-pointer bg-gray-700 py-2 px-3 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-600'>
						<Upload className='h-5 w-5 inline-block mr-2' />
						Upload Main Image
					</label>

					{newProduct.image && (
						<div className='mt-3 rounded-lg border border-gray-700 overflow-hidden bg-gray-900'>
							<img src={newProduct.image} alt='Preview' className='w-full h-56 object-cover' />
						</div>
					)}
				</div>

				<div>
					<p className='block text-sm font-medium text-gray-300 mb-2'>General Gallery Images</p>
					<input type='file' id='extraImages' className='sr-only' accept='image/*' multiple onChange={handleExtraImagesChange} />
					<label htmlFor='extraImages' className='cursor-pointer bg-gray-700 py-2 px-3 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-600'>
						<Upload className='h-5 w-5 inline-block mr-2' />
						Add General Images
					</label>

					{newProduct.images.length > 0 && (
						<div className='mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3'>
							{newProduct.images.map((src, idx) => (
								<div key={idx} className='relative rounded-lg overflow-hidden border border-gray-700'>
									<img src={src} alt={`Extra ${idx + 1}`} className='w-full h-28 object-cover' />
									<button type='button' onClick={() => removeExtraImage(idx)} className='absolute top-2 right-2 bg-black/60 text-white rounded-full p-1'>
										<X size={14} />
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				<button
					type='submit'
					className='w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50'
					disabled={loading}
				>
					{loading ? (
						<>
							<Loader className='mr-2 h-5 w-5 animate-spin' />
							Loading...
						</>
					) : (
						<>
							<PlusCircle className='mr-2 h-5 w-5' />
							Create Product
						</>
					)}
				</button>
			</form>
		</motion.div>
	);
};

const Input = ({ label, value, onChange, placeholder, type = "text" }) => (
	<div>
		<label className='block text-xs font-medium text-gray-400 mb-1'>{label}</label>
		<input
			type={type}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			min={type === "number" ? "0" : undefined}
			step={type === "number" ? "0.01" : undefined}
			className='block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
		/>
	</div>
);

export default CreateProductForm;