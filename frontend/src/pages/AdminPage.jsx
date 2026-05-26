import { BarChart, PlusCircle, ShoppingBasket } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import AnalyticsTab from "../components/AnalyticsTab";
import CreateProductForm from "../components/CreateProductForm";
import ProductsList from "../components/ProductsList";
import { useProductStore } from "../stores/useProductStore";

const tabs = [
	{ id: "create", label: "Create Product", icon: PlusCircle },
	{ id: "products", label: "Products", icon: ShoppingBasket },
	{ id: "analytics", label: "Analytics", icon: BarChart },
];

const AdminPage = () => {
	const [activeTab, setActiveTab] = useState("create");
	const { fetchAllProducts } = useProductStore();

	useEffect(() => {
		fetchAllProducts();
	}, [fetchAllProducts]);

	return (
		<div className='min-h-screen relative overflow-hidden'>
			<div className='relative z-10 container mx-auto px-3 sm:px-4 py-24 sm:py-16'>
				<motion.h1
					className='text-3xl sm:text-4xl font-bold mb-8 text-emerald-400 text-center'
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
				>
					Admin Dashboard
				</motion.h1>

				<div className='w-full mb-8 overflow-x-auto'>
                	<div className='flex min-w-max sm:min-w-0 sm:flex-wrap sm:justify-center gap-3 px-1 pb-2'>
                		{tabs.map((tab) => (
                			<button
                				key={tab.id}
                				onClick={() => setActiveTab(tab.id)}
                				className={`flex items-center justify-center whitespace-nowrap px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm sm:text-base ${
                					activeTab === tab.id
                						? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40"
                						: "bg-gray-700 text-gray-300 hover:bg-gray-600"
                				}`}
                			>
                				<tab.icon className='mr-2 h-5 w-5 flex-shrink-0' />
                				<span>{tab.label}</span>
                			</button>
                		))}
                	</div>
                </div>
				{activeTab === "create" && <CreateProductForm />}
				{activeTab === "products" && <ProductsList />}
				{activeTab === "analytics" && <AnalyticsTab />}
			</div>
		</div>
	);
};
export default AdminPage;
