import axios from "axios";
import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import nodemailer from "nodemailer";

const BANK_DETAILS = {
	bankName: "Capitec Bank",
	accountHolder: "Nduduzo Nene",
	accountNumber: "1579559245",
	branchCode: "470010",
	accountType: "Savings",
};

const WHATSAPP_NUMBER = "+27715692580";
const STORE_OWNER_EMAIL =
	process.env.STORE_OWNER_EMAIL || "mrpersonalshopper01@gmail.com";

function normalizeSelectedOptions(options) {
	const o = options && typeof options === "object" ? options : {};
	return {
		color: String(o.color || "").trim(),
		size: String(o.size || "").trim(),
		variantSku: String(o.variantSku || "").trim(),
	};
}

function formatSelectedOptions(selectedOptions) {
	const o = normalizeSelectedOptions(selectedOptions);

	const parts = [
		o.color ? `Color: ${o.color}` : null,
		o.size ? `Size: ${o.size}` : null,
		o.variantSku ? `SKU: ${o.variantSku}` : null,
	].filter(Boolean);

	return parts.length ? ` | ${parts.join(" | ")}` : "";
}

async function sendOrderEmailToOwner({ order, userEmail }) {
	if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
		console.warn("SMTP not configured. Skipping store owner email.");
		return;
	}

	const transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT || 587),
		secure: false,
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS,
		},
	});

	const items = (order.products || [])
		.map((p, idx) => {
			const productId = p.product?.toString?.() || String(p.product);
			const optionsText = formatSelectedOptions(p.selectedOptions);

			return `${idx + 1}. ProductID: ${productId} | Qty: ${
				p.quantity
			} | Price: R${Number(p.price).toFixed(2)}${optionsText}`;
		})
		.join("\n");

	const d = order.deliveryDetails || {};
	const deliveryBlock = `
Delivery details:
- Full name: ${d.fullName || "-"}
- Phone: ${d.phone || "-"}
- Address: ${d.addressLine || "-"}
- City: ${d.city || "-"}
- Province: ${d.province || "-"}
- Postal code: ${d.postalCode || "-"}
- Notes: ${d.notes || "-"}
`.trim();

	const subject = `NEW EFT ORDER: ${order.orderNumber || order._id} (Pending Payment)`;

	const text = `
New order received (EFT - Pending Payment)

Order reference (EFT): ${order.orderNumber || String(order._id)}
Order ID: ${order._id}
Customer email: ${userEmail || order.customerEmail || "-"}

${deliveryBlock}

Items:
${items}

Total: R${Number(order.totalAmount).toFixed(2)}

Customer instructions:
- Customer pays via EFT using the Order reference as payment reference
- Customer sends PoP via email (${STORE_OWNER_EMAIL}) or WhatsApp (${WHATSAPP_NUMBER})

Bank details:
- Bank: ${BANK_DETAILS.bankName}
- Account holder: ${BANK_DETAILS.accountHolder}
- Account number: ${BANK_DETAILS.accountNumber}
- Branch code: ${BANK_DETAILS.branchCode}
- Account type: ${BANK_DETAILS.accountType}
`.trim();

	await transporter.sendMail({
		from: process.env.SMTP_USER,
		to: STORE_OWNER_EMAIL,
		subject,
		text,
	});
}

export const createEftOrder = async (req, res) => {
	try {
		const { products, couponCode, deliveryDetails, customerEmail } = req.body;

		if (!Array.isArray(products) || products.length === 0) {
			return res.status(400).json({ error: "Invalid or empty products array" });
		}

		const userId = req.user?._id || null;
		const userEmail = req.user?.email || customerEmail || "";

		let totalAmount = 0;
		for (const p of products) {
			const price = Number(p.price) || 0;
			const qty = Number(p.quantity) || 1;
			totalAmount += price * qty;
		}

		let coupon = null;
		if (couponCode && userId) {
			coupon = await Coupon.findOne({
				code: couponCode,
				userId,
				isActive: true,
			});

			if (coupon) {
				totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
			}
		}

		const addressLine = deliveryDetails?.addressLine || deliveryDetails?.streetArea || "";

		const newOrder = new Order({
			user: userId,
			customerEmail: userEmail,
			products: products.map((p) => ({
				product: p._id || p.product || p.id || p.productId,
				quantity: Number(p.quantity) || 1,
				price: Number(p.price) || 0,

				// ✅ keep exact product choices for admin email + fulfilment
				selectedOptions: normalizeSelectedOptions(p.selectedOptions),

				// ✅ keep cart line reference where available
				cartKey: p.cartKey || "",
			})),
			totalAmount,
			paymentMethod: "EFT",
			status: "PENDING_PAYMENT",
			couponCode: couponCode || "",
			deliveryDetails: {
				fullName: deliveryDetails?.fullName || "",
				phone: deliveryDetails?.phone || "",
				addressLine,
				city: deliveryDetails?.city || "",
				province: deliveryDetails?.province || "",
				postalCode: deliveryDetails?.postalCode || "",
				notes: deliveryDetails?.notes || "",
			},
		});

		await newOrder.save();

		sendOrderEmailToOwner({ order: newOrder, userEmail }).catch((err) => {
			console.warn("Order email failed (ignored):", err.message);
		});

		if (coupon && couponCode && userId) {
			await Coupon.findOneAndUpdate({ code: couponCode, userId }, { isActive: false });
		}

		return res.status(201).json({
			success: true,
			orderId: newOrder._id,
			orderNumber: newOrder.orderNumber || String(newOrder._id),
			totalAmount: newOrder.totalAmount,
			currency: newOrder.currency || "ZAR",
			bankDetails: BANK_DETAILS,
			whatsappNumber: WHATSAPP_NUMBER,
			storeOwnerEmail: STORE_OWNER_EMAIL,
			message: "Order created. Awaiting EFT payment.",
		});
	} catch (error) {
		console.error("❌ EFT ORDER FAILED:", error);

		return res.status(500).json({
			message: error?.message || "Failed to create order",
		});
	}
};

export const getOrderById = async (req, res) => {
	try {
		const { orderId } = req.params;

		const isMongoId = /^[a-f\d]{24}$/i.test(orderId);

		const order = isMongoId
			? await Order.findById(orderId).lean()
			: await Order.findOne({ orderNumber: orderId }).lean();

		if (!order) return res.status(404).json({ message: "Order not found" });

		return res.json({
			success: true,
			order: {
				_id: order._id,
				orderNumber: order.orderNumber || String(order._id),
				totalAmount: order.totalAmount,
				currency: order.currency || "ZAR",
				status: order.status,
				paymentMethod: order.paymentMethod,
				customerEmail: order.customerEmail || "",
				deliveryDetails: order.deliveryDetails || {},
				products: order.products || [],
				createdAt: order.createdAt,
			},
			bankDetails: BANK_DETAILS,
			whatsappNumber: WHATSAPP_NUMBER,
			storeOwnerEmail: STORE_OWNER_EMAIL,
		});
	} catch (error) {
		console.error("Error fetching order:", error);
		return res.status(500).json({ message: "Error fetching order", error: error.message });
	}
};

export const initializeTransaction = async (req, res) => {
	try {
		const { products, couponCode } = req.body;

		if (!Array.isArray(products) || products.length === 0) {
			return res.status(400).json({ error: "Invalid or empty products array" });
		}

		let totalAmount = 0;
		products.forEach((p) => {
			totalAmount += p.price * 100 * (p.quantity || 1);
		});

		let coupon = null;
		if (couponCode) {
			coupon = await Coupon.findOne({
				code: couponCode,
				userId: req.user._id,
				isActive: true,
			});

			if (coupon) {
				totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
			}
		}

		const payload = {
			email: req.user.email,
			amount: totalAmount,
			currency: "ZAR",
			callback_url: `${process.env.CLIENT_URL}/purchase-success`,
			metadata: {
				userId: req.user._id.toString(),
				couponCode: couponCode || "",
				products: products.map((p) => ({
					id: p._id,
					quantity: p.quantity,
					price: p.price,
					selectedOptions: normalizeSelectedOptions(p.selectedOptions),
					cartKey: p.cartKey || "",
				})),
			},
		};

		const response = await axios.post("https://api.paystack.co/transaction/initialize", payload, {
			headers: {
				Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
				"Content-Type": "application/json",
			},
		});

		res.status(200).json({
			authorization_url: response.data.data.authorization_url,
			reference: response.data.data.reference,
			totalAmount: totalAmount / 100,
		});
	} catch (error) {
		console.error("Error initializing Paystack transaction:", error.response?.data || error.message);
		res.status(500).json({ message: "Error initializing payment", error: error.message });
	}
};

export const verifyTransaction = async (req, res) => {
	try {
		const { reference } = req.body;

		const verifyResponse = await axios.get(
			`https://api.paystack.co/transaction/verify/${reference}`,
			{ headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
		);

		const data = verifyResponse.data.data;

		if (data.status === "success") {
			const meta = data.metadata;

			if (meta.couponCode) {
				await Coupon.findOneAndUpdate(
					{ code: meta.couponCode, userId: meta.userId },
					{ isActive: false }
				);
			}

			const newOrder = new Order({
				user: meta.userId,
				products: meta.products.map((p) => ({
					product: p.id,
					quantity: p.quantity,
					price: p.price,
					selectedOptions: normalizeSelectedOptions(p.selectedOptions),
					cartKey: p.cartKey || "",
				})),
				totalAmount: data.amount / 100,
				paystackReference: reference,
				paymentMethod: "GATEWAY",
				status: "PAID",
			});

			await newOrder.save();

			res.status(200).json({
				success: true,
				message: "Payment verified successfully, order created.",
				orderId: newOrder._id,
			});
		} else {
			res.status(400).json({ success: false, message: "Payment was not successful." });
		}
	} catch (error) {
		console.error("Error verifying Paystack transaction:", error.response?.data || error.message);
		res.status(500).json({ message: "Error verifying payment", error: error.message });
	}
};