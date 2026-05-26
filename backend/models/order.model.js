import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: false,
		},

		orderNumber: {
			type: String,
			unique: true,
			sparse: true,
			index: true,
		},

		customerEmail: {
			type: String,
			default: "",
			trim: true,
			lowercase: true,
		},

		products: [
			{
				product: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "Product",
					required: true,
				},
				quantity: {
					type: Number,
					required: true,
					min: 1,
				},
				price: {
					type: Number,
					required: true,
					min: 0,
				},

				// ✅ Store exact chosen product options for admin email + fulfilment
				selectedOptions: {
					color: { type: String, default: "" },
					size: { type: String, default: "" },
					variantSku: { type: String, default: "" },
				},

				// ✅ Optional stable cart line reference
				cartKey: {
					type: String,
					default: "",
				},
			},
		],

		totalAmount: {
			type: Number,
			required: true,
			min: 0,
		},

		paymentMethod: {
			type: String,
			enum: ["EFT", "GATEWAY"],
			default: "EFT",
		},

		status: {
			type: String,
			enum: ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "CANCELLED"],
			default: "PENDING_PAYMENT",
		},

		deliveryDetails: {
			fullName: { type: String, default: "" },
			phone: { type: String, default: "" },
			addressLine: { type: String, default: "" },
			city: { type: String, default: "" },
			province: { type: String, default: "" },
			postalCode: { type: String, default: "" },
			notes: { type: String, default: "" },
		},

		couponCode: { type: String, default: "" },

		paystackReference: {
			type: String,
			unique: true,
			sparse: true,
		},

		currency: {
			type: String,
			default: "ZAR",
			enum: ["ZAR"],
		},
	},
	{ timestamps: true }
);

orderSchema.pre("save", function (next) {
	if (!this.orderNumber) {
		const now = new Date();
		const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
		const timePart = String(now.getTime()).slice(-9);
		const randPart = Math.floor(1000000 + Math.random() * 9000000);
		this.orderNumber = `MRP-${datePart}-${timePart}-${randPart}`;
	}
	next();
});

const Order = mongoose.model("Order", orderSchema);
export default Order;