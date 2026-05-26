import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import Product from "../models/product.model.js";
import { connectDB } from "../lib/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const products = [
	{
		name: "AirRunner Shadow - Black/White",
		description: "Everyday sneaker with clean contrast. Comfortable for daily wear.",
		price: 1899,
		image: "https://placehold.co/800x800/png?text=AirRunner+Shadow",
		category: "shoes",
		isFeatured: true,
	},
	{
		name: "StreetFlex 1 - Triple Black",
		description: "Minimal triple-black look. Built for comfort and street style.",
		price: 1599,
		image: "https://placehold.co/800x800/png?text=StreetFlex+1",
		category: "shoes",
		isFeatured: true,
	},
	{
		name: "CloudStep Pro - White/Grey",
		description: "Lightweight runner-inspired sneaker with cushioned feel.",
		price: 1799,
		image: "https://placehold.co/800x800/png?text=CloudStep+Pro",
		category: "shoes",
	},
	{
		name: "RetroCourt '88 - White/Red",
		description: "Classic court silhouette with retro color pop.",
		price: 1999,
		image: "https://placehold.co/800x800/png?text=RetroCourt+88",
		category: "shoes",
		isFeatured: true,
	},
	{
		name: "UrbanWave - Sand/Olive",
		description: "Neutral-toned sneaker that pairs easily with any outfit.",
		price: 1699,
		image: "https://placehold.co/800x800/png?text=UrbanWave",
		category: "shoes",
	},
	{
		name: "NeoRunner Lite - Ice Blue",
		description: "Breathable upper with a modern sporty profile.",
		price: 1499,
		image: "https://placehold.co/800x800/png?text=NeoRunner+Lite",
		category: "shoes",
	},
	{
		name: "MetroHigh - Black/Gum",
		description: "High-top look with gum sole for a timeless street finish.",
		price: 2099,
		image: "https://placehold.co/800x800/png?text=MetroHigh",
		category: "shoes",
	},
	{
		name: "DropDay Classic - White/Blue",
		description: "Clean drop-day style sneaker with sharp blue accents.",
		price: 1899,
		image: "https://placehold.co/800x800/png?text=DropDay+Classic",
		category: "shoes",
	},
	{
		name: "RunnerX Knit - Graphite",
		description: "Soft knit feel and flexible sole for all-day comfort.",
		price: 1749,
		image: "https://placehold.co/800x800/png?text=RunnerX+Knit",
		category: "shoes",
	},
	{
		name: "CourtPrime - White/Green",
		description: "Fresh court-inspired sneaker with a clean green detail.",
		price: 1649,
		image: "https://placehold.co/800x800/png?text=CourtPrime",
		category: "shoes",
	},
	{
		name: "NightShift Max - Black/Red",
		description: "Bold black/red combo with chunkier sole profile.",
		price: 2199,
		image: "https://placehold.co/800x800/png?text=NightShift+Max",
		category: "shoes",
		isFeatured: true,
	},
	{
		name: "Everyday Low - White",
		description: "Simple low-top essential. Easy to match, easy to wear.",
		price: 1399,
		image: "https://placehold.co/800x800/png?text=Everyday+Low",
		category: "shoes",
	},
];

async function seedProducts() {
	try {
		await connectDB();

		// Optional: wipe only shoes to avoid nuking other categories
		const deleted = await Product.deleteMany({ category: "shoes" });

		const inserted = await Product.insertMany(products);

		console.log(`[seed] deleted ${deleted.deletedCount} existing "shoes" products`);
		console.log(`[seed] inserted ${inserted.length} products`);
		process.exit(0);
	} catch (err) {
		console.error("[seed] error:", err.message);
		process.exit(1);
	}
}

seedProducts();
