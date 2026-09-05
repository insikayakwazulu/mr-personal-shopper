import { ArrowRight, CheckCircle, Copy, MessageCircle, Mail } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Confetti from "react-confetti";
import { useCartStore } from "../stores/useCartStore";
import axios from "../lib/axios";

const WHATSAPP_NUMBER_DISPLAY = "+27 71 569 2580";
const WHATSAPP_NUMBER_WA = "27715692580";

// Quick check for Mongo ObjectId format
const isMongoId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

const PurchaseSuccessPage = () => {
	const [searchParams] = useSearchParams();

	const [orderId, setOrderId] = useState(""); // Mongo _id (if we have it)
	const [orderRef, setOrderRef] = useState(""); // orderNumber preferred, fallback to _id
	const [bankDetails, setBankDetails] = useState(null);
	const [storeEmail, setStoreEmail] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const clearCart = useCartStore((s) => s.clearCart);

	// Confetti sizing
	const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
	useEffect(() => {
		const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	// Helper: fetch order info (with 1 retry)
	const fetchOrder = async (idOrRef) => {
		// Your backend route is GET /api/payments/orders/:orderId (expects Mongo id)
		// If idOrRef is NOT a mongo id, we can't fetch by it unless backend supports orderNumber lookup.
		if (!isMongoId(idOrRef)) {
			return null;
		}

		try {
			const res = await axios.get(`/payments/orders/${idOrRef}`);
			return res?.data || null;
		} catch (e) {
			// retry once after short delay (handles immediate redirect after save)
			await new Promise((r) => setTimeout(r, 600));
			const res2 = await axios.get(`/payments/orders/${idOrRef}`);
			return res2?.data || null;
		}
	};

	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				setError(null);

				// Accept either param name (future-proof)
				const fromQuery = searchParams.get("orderId") || searchParams.get("orderRef");

				// Storage fallback
				const fromStorage =
					localStorage.getItem("last_order_id") || localStorage.getItem("last_order_ref");

				const finalRef = fromQuery || fromStorage;

				if (!finalRef) {
					setError("No order reference was found. Please go back to checkout and place the order again.");
					setLoading(false);
					return;
				}

				// Store what we got (might be mongo id, might be order number)
				if (isMongoId(finalRef)) setOrderId(finalRef);

				// Try to fetch order (only possible if we have Mongo id)
				const data = await fetchOrder(finalRef);

				if (!data?.order?._id) {
					// If we couldn't fetch (because it's not a Mongo id or backend returned 404),
					// we still show the reference so the customer can pay + send PoP.
					setOrderRef(finalRef);
					setBankDetails(null);
					setStoreEmail("");
					setLoading(false);
					return;
				}

				const order = data.order;

				// Prefer orderNumber for EFT reference
				setOrderRef(order.orderNumber || order._id);
				setBankDetails(data.bankDetails || null);
				setStoreEmail(data.storeOwnerEmail || "");

				// ✅ Clear cart ONLY after we successfully loaded the order
				if (typeof clearCart === "function") await clearCart();

				setLoading(false);
			} catch (e) {
				console.error("Failed to load order info:", e);
				setError(
					"Order could not be loaded. If you just placed the order, refresh once. Otherwise contact support with your order reference."
				);
				setLoading(false);
			}
		})();
	}, [searchParams, clearCart]);

	const whatsappLink = useMemo(() => {
		const ref = orderRef || orderId;
		const msg = encodeURIComponent(
			`Hi MR Personal Shopper, I have made an EFT payment for order reference ${ref}. Here is my Proof of Payment (PoP).`
		);
		return `https://wa.me/${WHATSAPP_NUMBER_WA}?text=${msg}`;
	}, [orderRef, orderId]);

	const emailLink = useMemo(() => {
		const ref = orderRef || orderId;
		const subject = encodeURIComponent(`Proof of Payment - Order ${ref}`);
		const body = encodeURIComponent(
			`Hi MR Personal Shopper,\n\nI have made an EFT payment for order ${ref}.\nPlease find my Proof of Payment attached.\n\nOrder Reference: ${ref}\n\nThank you.`
		);
		return `mailto:${storeEmail || "mrpersonalshopper01@gmail.com"}?subject=${subject}&body=${body}`;
	}, [orderRef, orderId, storeEmail]);

	const copyRef = async () => {
		const ref = orderRef || orderId;
		try {
			await navigator.clipboard.writeText(ref);
			alert("Order reference copied!");
		} catch {
			alert("Copy failed. Please copy the order reference manually.");
		}
	};

	if (loading) return <div className='p-6 text-gray-300'>Loading your order details...</div>;
	if (error) return <div className='p-6 text-red-400'>{error}</div>;

	// Fallback bank details
	const BANK = bankDetails || {
		bankName: "Capitec Bank",
		accountHolder: "NB Nene",
		accountNumber: "1579559245",
		branchCode: "470010",
		accountType: "Savings",
	};

	const STORE_EMAIL = storeEmail || "mrpersonalshopper01@gmail.com";
	const refToShow = orderRef || orderId;

	return (
		<div className='min-h-screen flex items-center justify-center px-4 py-10'>
			<Confetti
				width={size.width}
				height={size.height}
				gravity={0.1}
				style={{ zIndex: 99 }}
				numberOfPieces={500}
				recycle={false}
			/>

			<div className='max-w-lg w-full bg-gray-800 rounded-lg shadow-xl overflow-hidden relative z-10'>
				<div className='p-6 sm:p-8'>
					<div className='flex justify-center'>
						<CheckCircle className='text-emerald-400 w-16 h-16 mb-4' />
					</div>

					<h1 className='text-2xl sm:text-3xl font-bold text-center text-emerald-400 mb-2'>
						Order Created!
					</h1>

					<p className='text-gray-300 text-center mb-4'>
						To complete your purchase, please pay via EFT using your order reference as the payment reference.
					</p>

					<div className='bg-gray-700 rounded-lg p-4 mb-4'>
						<div className='flex items-center justify-between mb-2'>
							<span className='text-sm text-gray-300'>Order reference</span>
							<span className='text-sm font-semibold text-emerald-400 break-all'>{refToShow}</span>
						</div>

						<button
							onClick={copyRef}
							className='w-full mt-2 bg-gray-800 hover:bg-gray-900 text-emerald-300 font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2'
						>
							<Copy size={16} /> Copy order reference
						</button>
					</div>

					<div className='bg-gray-700 rounded-lg p-4 mb-4 text-gray-200'>
						<p className='font-semibold text-emerald-300 mb-2'>Bank Transfer (EFT) Details</p>
						<ul className='text-sm space-y-1'>
							<li><span className='text-gray-300'>Bank:</span> {BANK.bankName}</li>
							<li><span className='text-gray-300'>Account Holder:</span> {BANK.accountHolder}</li>
							<li><span className='text-gray-300'>Account Number:</span> {BANK.accountNumber}</li>
							<li><span className='text-gray-300'>Branch Code:</span> {BANK.branchCode}</li>
							<li><span className='text-gray-300'>Account Type:</span> {BANK.accountType}</li>
						</ul>

						<p className='text-sm text-gray-300 mt-3'>
							Payment should be made immediately for quicker delivery. Submit your Proof of Payment (PoP)
							along with your order reference.
						</p>
					</div>

					<div className='space-y-3 mb-6'>
						<a
							href={whatsappLink}
							target='_blank'
							rel='noreferrer'
							className='w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2'
						>
							<MessageCircle size={18} />
							Send PoP on WhatsApp ({WHATSAPP_NUMBER_DISPLAY})
						</a>

						<a
							href={emailLink}
							className='w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2'
						>
							<Mail size={18} />
							Send PoP via Email ({STORE_EMAIL})
						</a>
					</div>

					<Link
						to={"/"}
						className='w-full bg-gray-700 hover:bg-gray-600 text-emerald-400 font-bold py-2 px-4 rounded-lg transition flex items-center justify-center'
					>
						Continue Shopping
						<ArrowRight className='ml-2' size={18} />
					</Link>

					<p className='text-xs text-gray-400 text-center mt-4'>
						Your order will be processed after payment is received and confirmed.
					</p>
				</div>
			</div>
		</div>
	);
};

export default PurchaseSuccessPage;
