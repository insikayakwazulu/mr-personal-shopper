import { motion } from "framer-motion";
import { Trash, Star } from "lucide-react";
import { useProductStore } from "../stores/useProductStore";

const ProductsList = () => {
	const { deleteProduct, toggleFeaturedProduct, products } = useProductStore();

	return (
		<motion.div
			className='bg-gray-800 shadow-lg rounded-2xl overflow-hidden max-w-6xl mx-auto'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.8 }}
		>
			<div className='hidden md:block overflow-x-auto'>
				<table className='min-w-full divide-y divide-gray-700'>
					<thead className='bg-gray-700'>
						<tr>
							<TableHead>Product</TableHead>
							<TableHead>Price</TableHead>
							<TableHead>Category</TableHead>
							<TableHead>Featured</TableHead>
							<TableHead>Actions</TableHead>
						</tr>
					</thead>

					<tbody className='bg-gray-800 divide-y divide-gray-700'>
						{products?.map((product) => (
							<tr key={product._id} className='hover:bg-gray-700'>
								<td className='px-6 py-4'>
									<ProductInfo product={product} />
								</td>
								<td className='px-6 py-4 text-sm text-gray-300'>
									R{Number(product.price || 0).toFixed(2)}
								</td>
								<td className='px-6 py-4 text-sm text-gray-300 capitalize'>
									{product.category}
								</td>
								<td className='px-6 py-4'>
									<FeaturedButton product={product} toggleFeaturedProduct={toggleFeaturedProduct} />
								</td>
								<td className='px-6 py-4'>
									<DeleteButton product={product} deleteProduct={deleteProduct} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className='md:hidden divide-y divide-gray-700'>
				{products?.map((product) => (
					<div key={product._id} className='p-4 space-y-4'>
						<ProductInfo product={product} />

						<div className='grid grid-cols-2 gap-3 text-sm'>
							<div className='rounded-lg bg-gray-900 p-3'>
								<p className='text-gray-500 text-xs uppercase'>Price</p>
								<p className='text-emerald-400 font-semibold'>
									R{Number(product.price || 0).toFixed(2)}
								</p>
							</div>

							<div className='rounded-lg bg-gray-900 p-3'>
								<p className='text-gray-500 text-xs uppercase'>Category</p>
								<p className='text-gray-200 font-medium capitalize'>{product.category}</p>
							</div>
						</div>

						<div className='flex items-center justify-between gap-3'>
							<FeaturedButton product={product} toggleFeaturedProduct={toggleFeaturedProduct} />
							<DeleteButton product={product} deleteProduct={deleteProduct} />
						</div>
					</div>
				))}
			</div>
		</motion.div>
	);
};

const TableHead = ({ children }) => (
	<th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
		{children}
	</th>
);

const ProductInfo = ({ product }) => (
	<div className='flex items-center gap-4'>
		<img
			className='h-14 w-14 rounded-xl object-cover bg-gray-700 flex-shrink-0'
			src={product.image}
			alt={product.name}
		/>
		<div className='min-w-0'>
			<p className='text-sm sm:text-base font-semibold text-white truncate'>{product.name}</p>
			<p className='text-xs text-gray-400 capitalize'>{product.category}</p>
		</div>
	</div>
);

const FeaturedButton = ({ product, toggleFeaturedProduct }) => (
	<button
		onClick={() => toggleFeaturedProduct(product._id)}
		className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
			product.isFeatured
				? "bg-yellow-400 text-gray-900 hover:bg-yellow-500"
				: "bg-gray-700 text-gray-300 hover:bg-gray-600"
		}`}
	>
		<Star className='h-5 w-5' />
		<span className='md:hidden'>{product.isFeatured ? "Featured" : "Not Featured"}</span>
	</button>
);

const DeleteButton = ({ product, deleteProduct }) => (
	<button
		onClick={() => deleteProduct(product._id)}
		className='inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300'
	>
		<Trash className='h-5 w-5' />
		<span className='md:hidden'>Delete</span>
	</button>
);

export default ProductsList;