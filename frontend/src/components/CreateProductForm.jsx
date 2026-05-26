import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PlusCircle, Upload, Loader, X, Plus } from "lucide-react";
import { useProductStore } from "../stores/useProductStore";
import toast from "react-hot-toast";

const categories = ["jeans", "t-shirts", "shoes", "glasses", "jackets", "suits", "bags" , "phones"];

const CreateProductForm = () => {
	const { createProduct, loading } = useProductStore();

	const [newProduct, setNewProduct] = useState({
		name: "",
		description: "",
		price: "",
		originalPrice: "",

		category: "",

		// main image (existing)
		image: "",

		// extra images (new)
		images: [],

		// stock (new)
		stockQuantity: "",
		lowStockThreshold: "10",

		// options (new)
		options: {
			colors: [],
			sizes: [],
		},

		// currency fixed (ZAR only)
		currency: "ZAR",
	});

	// inputs for adding chips
	const [colorInput, setColorInput] = useState("");
	const [sizeInput, setSizeInput] = useState("");

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
			currency: "ZAR",
		});
		setColorInput("");
		setSizeInput("");
	};

	const canSubmit = useMemo(() => {
		if (!newProduct.name.trim()) return false;
		if (!newProduct.description.trim()) return false;
		if (!String(newProduct.price).trim()) return false;
		if (!newProduct.category.trim()) return false;
		if (!newProduct.image) return false;
		return true;
	}, [newProduct]);

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!canSubmit) {
			toast.error("Please fill all required fields (name, description, price, category, main image).");
			return;
		}

		// Build payload in the shape backend expects
		const payload = {
			name: newProduct.name.trim(),
			description: newProduct.description.trim(),
			category: newProduct.category.trim(),
			currency: "ZAR",

			price: Number(newProduct.price) || 0,

			// originalPrice optional
			originalPrice:
				newProduct.originalPrice === "" || newProduct.originalPrice === null
					? null
					: Number(newProduct.originalPrice) || null,

			// main image required
			image: newProduct.image,

			// extra images optional (base64)
			images: Array.isArray(newProduct.images) ? newProduct.images : [],

			// stockQuantity optional
			stockQuantity: newProduct.stockQuantity === "" ? 0 : Number(newProduct.stockQuantity) || 0,
			lowStockThreshold:
				newProduct.lowStockThreshold === "" ? 10 : Number(newProduct.lowStockThreshold) || 10,

			options: {
				colors: newProduct.options?.colors || [],
				sizes: newProduct.options?.sizes || [],
			},
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

	// main image upload
	const handleMainImageChange = (e) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onloadend = () => {
			setNewProduct((p) => ({ ...p, image: reader.result }));
		};
		reader.readAsDataURL(file);
	};

	// add extra images
	const handleExtraImagesChange = (e) => {
		const files = Array.from(e.target.files || []);
		if (!files.length) return;

		// read sequentially to avoid race
		const readNext = (index, collected) => {
			if (index >= files.length) {
				setNewProduct((p) => ({
					...p,
					images: [...(p.images || []), ...collected],
				}));
				return;
			}

			const file = files[index];
			const reader = new FileReader();
			reader.onloadend = () => readNext(index + 1, [...collected, reader.result]);
			reader.readAsDataURL(file);
		};

		readNext(0, []);
	};

	const removeExtraImage = (idx) => {
		setNewProduct((p) => ({
			...p,
			images: (p.images || []).filter((_, i) => i !== idx),
		}));
	};

	// chips helpers
	const addColor = () => {
		const value = colorInput.trim();
		if (!value) return;
		setNewProduct((p) => {
			const existing = p.options?.colors || [];
			if (existing.map((x) => x.toLowerCase()).includes(value.toLowerCase())) return p;
			return { ...p, options: { ...p.options, colors: [...existing, value] } };
		});
		setColorInput("");
	};

	const removeColor = (value) => {
		setNewProduct((p) => ({
			...p,
			options: {
				...p.options,
				colors: (p.options?.colors || []).filter((c) => c !== value),
			},
		}));
	};

	const addSize = () => {
		const value = sizeInput.trim();
		if (!value) return;
		setNewProduct((p) => {
			const existing = p.options?.sizes || [];
			if (existing.map((x) => x.toLowerCase()).includes(value.toLowerCase())) return p;
			return { ...p, options: { ...p.options, sizes: [...existing, value] } };
		});
		setSizeInput("");
	};

	const removeSize = (value) => {
		setNewProduct((p) => ({
			...p,
			options: {
				...p.options,
				sizes: (p.options?.sizes || []).filter((s) => s !== value),
			},
		}));
	};

	return (
		<motion.div
			className='bg-gray-800 shadow-lg rounded-lg p-8 mb-8 max-w-2xl mx-auto'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.8 }}
		>
			<h2 className='text-2xl font-semibold mb-6 text-emerald-300'>Create New Product</h2>

			<form onSubmit={handleSubmit} className='space-y-4'>
				{/* Name */}
				<div>
					<label htmlFor='name' className='block text-sm font-medium text-gray-300'>
						Product Name *
					</label>
					<input
						type='text'
						id='name'
						value={newProduct.name}
						onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
						className='mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
						required
					/>
				</div>

				{/* Description */}
				<div>
					<label htmlFor='description' className='block text-sm font-medium text-gray-300'>
						Description *
					</label>
					<textarea
						id='description'
						value={newProduct.description}
						onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
						rows='3'
						className='mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
						required
					/>
				</div>

				{/* Pricing row */}
				<div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
					<div>
						<label htmlFor='price' className='block text-sm font-medium text-gray-300'>
							Price (ZAR) *
						</label>
						<input
							type='number'
							id='price'
							value={newProduct.price}
							onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
							step='0.01'
							min='0'
							className='mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
							required
						/>
					</div>

					<div>
						<label htmlFor='originalPrice' className='block text-sm font-medium text-gray-300'>
							Original Price (optional)
						</label>
						<input
							type='number'
							id='originalPrice'
							value={newProduct.originalPrice}
							onChange={(e) => setNewProduct((p) => ({ ...p, originalPrice: e.target.value }))}
							step='0.01'
							min='0'
							className='mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
							placeholder='e.g. 1299.00'
						/>
						<p className='text-xs text-gray-400 mt-1'>
							If set higher than Price, frontend can show a crossed-out sale price.
						</p>
					</div>
				</div>

				{/* Category */}
				<div>
					<label htmlFor='category' className='block text-sm font-medium text-gray-300'>
						Category *
					</label>
					<select
						id='category'
						value={newProduct.category}
						onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}
						className='mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
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

				{/* Stock */}
				<div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
					<div>
						<label htmlFor='stockQuantity' className='block text-sm font-medium text-gray-300'>
							Stock Quantity (optional)
						</label>
						<input
							type='number'
							id='stockQuantity'
							value={newProduct.stockQuantity}
							onChange={(e) => setNewProduct((p) => ({ ...p, stockQuantity: e.target.value }))}
							min='0'
							className='mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
							placeholder='e.g. 25'
						/>
					</div>

					<div>
						<label htmlFor='lowStockThreshold' className='block text-sm font-medium text-gray-300'>
							Low stock threshold (optional)
						</label>
						<input
							type='number'
							id='lowStockThreshold'
							value={newProduct.lowStockThreshold}
							onChange={(e) => setNewProduct((p) => ({ ...p, lowStockThreshold: e.target.value }))}
							min='0'
							className='mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
							placeholder='10'
						/>
					</div>
				</div>

				{/* Options: Colors + Sizes */}
				<div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
					<div className='rounded-lg border border-gray-700 bg-gray-900 p-4'>
						<p className='text-sm font-medium text-gray-300 mb-2'>Colors (optional)</p>
						<div className='flex gap-2'>
							<input
								value={colorInput}
								onChange={(e) => setColorInput(e.target.value)}
								className='w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500'
								placeholder='e.g. Black'
							/>
							<button
								type='button'
								onClick={addColor}
								className='shrink-0 inline-flex items-center gap-1 rounded-md bg-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-600'
							>
								<Plus size={16} /> Add
							</button>
						</div>

						<div className='mt-3 flex flex-wrap gap-2'>
							{(newProduct.options.colors || []).map((c) => (
								<span
									key={c}
									className='inline-flex items-center gap-2 rounded-full bg-gray-800 border border-gray-700 px-3 py-1 text-sm text-gray-200'
								>
									{c}
									<button
										type='button'
										onClick={() => removeColor(c)}
										className='text-gray-400 hover:text-white'
										aria-label='Remove color'
									>
										<X size={14} />
									</button>
								</span>
							))}
							{(newProduct.options.colors || []).length === 0 && (
								<p className='text-xs text-gray-500'>No colors added.</p>
							)}
						</div>
					</div>

					<div className='rounded-lg border border-gray-700 bg-gray-900 p-4'>
						<p className='text-sm font-medium text-gray-300 mb-2'>Sizes (optional)</p>
						<div className='flex gap-2'>
							<input
								value={sizeInput}
								onChange={(e) => setSizeInput(e.target.value)}
								className='w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500'
								placeholder='e.g. S, M, L, XL'
							/>
							<button
								type='button'
								onClick={addSize}
								className='shrink-0 inline-flex items-center gap-1 rounded-md bg-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-600'
							>
								<Plus size={16} /> Add
							</button>
						</div>

						<div className='mt-3 flex flex-wrap gap-2'>
							{(newProduct.options.sizes || []).map((s) => (
								<span
									key={s}
									className='inline-flex items-center gap-2 rounded-full bg-gray-800 border border-gray-700 px-3 py-1 text-sm text-gray-200'
								>
									{s}
									<button
										type='button'
										onClick={() => removeSize(s)}
										className='text-gray-400 hover:text-white'
										aria-label='Remove size'
									>
										<X size={14} />
									</button>
								</span>
							))}
							{(newProduct.options.sizes || []).length === 0 && (
								<p className='text-xs text-gray-500'>No sizes added.</p>
							)}
						</div>
					</div>
				</div>

				{/* Main image */}
				<div className='mt-2'>
					<p className='block text-sm font-medium text-gray-300 mb-2'>Main Image *</p>

					<div className='flex items-center gap-3'>
						<input
							type='file'
							id='image'
							className='sr-only'
							accept='image/*'
							onChange={handleMainImageChange}
						/>
						<label
							htmlFor='image'
							className='cursor-pointer bg-gray-700 py-2 px-3 border border-gray-600 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'
						>
							<Upload className='h-5 w-5 inline-block mr-2' />
							Upload Main Image
						</label>

						{newProduct.image && <span className='text-sm text-gray-400'>Main image uploaded ✅</span>}
					</div>

					{newProduct.image && (
						<div className='mt-3 rounded-lg border border-gray-700 overflow-hidden bg-gray-900'>
							<img src={newProduct.image} alt='Preview' className='w-full h-56 object-cover' />
						</div>
					)}
				</div>

				{/* Extra images */}
				<div className='mt-2'>
					<p className='block text-sm font-medium text-gray-300 mb-2'>Extra Images (optional)</p>

					<div className='flex items-center gap-3'>
						<input
							type='file'
							id='extraImages'
							className='sr-only'
							accept='image/*'
							multiple
							onChange={handleExtraImagesChange}
						/>
						<label
							htmlFor='extraImages'
							className='cursor-pointer bg-gray-700 py-2 px-3 border border-gray-600 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'
						>
							<Upload className='h-5 w-5 inline-block mr-2' />
							Add Extra Images
						</label>

						{(newProduct.images || []).length > 0 && (
							<span className='text-sm text-gray-400'>{newProduct.images.length} extra image(s)</span>
						)}
					</div>

					{(newProduct.images || []).length > 0 && (
						<div className='mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3'>
							{newProduct.images.map((src, idx) => (
								<div key={idx} className='relative rounded-lg overflow-hidden border border-gray-700'>
									<img src={src} alt={`Extra ${idx + 1}`} className='w-full h-28 object-cover' />
									<button
										type='button'
										onClick={() => removeExtraImage(idx)}
										className='absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1'
										aria-label='Remove image'
									>
										<X size={14} />
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Submit */}
				<button
					type='submit'
					className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50'
					disabled={loading}
				>
					{loading ? (
						<>
							<Loader className='mr-2 h-5 w-5 animate-spin' aria-hidden='true' />
							Loading...
						</>
					) : (
						<>
							<PlusCircle className='mr-2 h-5 w-5' />
							Create Product
						</>
					)}
				</button>

				<p className='text-xs text-gray-500'>
					Note: Variants (color+size stock per combination) will be added after this step is stable.
				</p>
			</form>
		</motion.div>
	);
};

export default CreateProductForm;