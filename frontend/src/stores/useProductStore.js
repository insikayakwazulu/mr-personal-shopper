import { create } from "zustand";
import toast from "react-hot-toast";
import axios from "../lib/axios";

const getErrorMessage = (error, fallback) =>
	error?.response?.data?.message ||
	error?.response?.data?.error ||
	fallback;

export const useProductStore = create((set) => ({
	products: [],
	loading: false,
	error: null,

	setProducts: (products) =>
		set({
			products: Array.isArray(products) ? products : [],
		}),

	createProduct: async (productData) => {
		set({ loading: true, error: null });

		try {
			const response = await axios.post(
				"/products",
				productData
			);

			const createdProduct =
				response?.data?.product || response?.data;

			set((state) => ({
				products: createdProduct
					? [...state.products, createdProduct]
					: state.products,
				loading: false,
			}));

			return createdProduct;
		} catch (error) {
			const message = getErrorMessage(
				error,
				"Failed to create product"
			);

			set({
				loading: false,
				error: message,
			});

			toast.error(message);

			throw error;
		}
	},

	updateProduct: async (productId, productData) => {
		set({ loading: true, error: null });

		try {
			const response = await axios.put(
				`/products/${productId}`,
				productData
			);

			const updatedProduct =
				response?.data?.product || response?.data;

			set((state) => ({
				products: state.products.map((product) =>
					product._id === productId
						? updatedProduct
						: product
				),
				loading: false,
			}));

			return updatedProduct;
		} catch (error) {
			const message = getErrorMessage(
				error,
				"Failed to update product"
			);

			set({
				loading: false,
				error: message,
			});

			toast.error(message);

			throw error;
		}
	},

	fetchAllProducts: async () => {
		set({ loading: true, error: null });

		try {
			const response = await axios.get("/products");

			set({
				products: Array.isArray(
					response?.data?.products
				)
					? response.data.products
					: [],
				loading: false,
			});
		} catch (error) {
			const message = getErrorMessage(
				error,
				"Failed to fetch products"
			);

			set({
				error: message,
				loading: false,
			});

			toast.error(message);
		}
	},

	fetchProductsByCategory: async (category) => {
		set({ loading: true, error: null });

		try {
			const response = await axios.get(
				`/products/category/${category}`
			);

			set({
				products: Array.isArray(
					response?.data?.products
				)
					? response.data.products
					: [],
				loading: false,
			});
		} catch (error) {
			const message = getErrorMessage(
				error,
				"Failed to fetch products"
			);

			set({
				error: message,
				loading: false,
			});

			toast.error(message);
		}
	},

	deleteProduct: async (productId) => {
		set({ loading: true, error: null });

		try {
			await axios.delete(`/products/${productId}`);

			set((state) => ({
				products: state.products.filter(
					(product) =>
						product._id !== productId
				),
				loading: false,
			}));

			toast.success("Product deleted");
		} catch (error) {
			const message = getErrorMessage(
				error,
				"Failed to delete product"
			);

			set({
				loading: false,
				error: message,
			});

			toast.error(message);

			throw error;
		}
	},

	toggleFeaturedProduct: async (productId) => {
		set({ loading: true, error: null });

		try {
			const response = await axios.patch(
				`/products/${productId}`
			);

			const updatedProduct =
				response?.data?.product || response?.data;

			set((state) => ({
				products: state.products.map((product) =>
					product._id === productId
						? updatedProduct
						: product
				),
				loading: false,
			}));

			return updatedProduct;
		} catch (error) {
			const message = getErrorMessage(
				error,
				"Failed to update product"
			);

			set({
				loading: false,
				error: message,
			});

			toast.error(message);

			throw error;
		}
	},

	fetchFeaturedProducts: async () => {
		set({ loading: true, error: null });

		try {
			const response =
				await axios.get("/products/featured");

			set({
				products: Array.isArray(
					response?.data?.products
				)
					? response.data.products
					: Array.isArray(response?.data)
						? response.data
						: [],
				loading: false,
			});
		} catch (error) {
			const message = getErrorMessage(
				error,
				"Failed to fetch featured products"
			);

			set({
				error: message,
				loading: false,
			});

			console.log(
				"Error fetching featured products:",
				error
			);
		}
	},
}));