import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { useCartStore } from "../stores/useCartStore";
import { Link, useNavigate } from "react-router-dom";
import { MoveRight, X, Loader2 } from "lucide-react";
import axios from "../lib/axios";

const OrderSummary = () => {
  const navigate = useNavigate();

  const { total, subtotal, coupon, isCouponApplied, cart, clearCart } = useCartStore();

  const savings = subtotal - total;
  const formattedSubtotal = subtotal.toFixed(2);
  const formattedTotal = total.toFixed(2);
  const formattedSavings = savings.toFixed(2);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [delivery, setDelivery] = useState({
    fullName: "",
    phone: "",
    addressLine: "",
    city: "",
    province: "",
    postalCode: "",
    notes: "",
  });

  const canSubmit = useMemo(() => {
    if (!delivery.fullName.trim()) return false;
    if (!delivery.phone.trim()) return false;
    if (!delivery.addressLine.trim()) return false;
    if (!delivery.city.trim()) return false;
    if (!cart || cart.length === 0) return false;
    return true;
  }, [delivery, cart]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleEftCheckout = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await axios.post("/payments/eft-create-order", {
        products: cart,
        couponCode: coupon ? coupon.code : null,
        deliveryDetails: {
          fullName: delivery.fullName,
          phone: delivery.phone,
          addressLine: delivery.addressLine,
          city: delivery.city,
          province: delivery.province,
          postalCode: delivery.postalCode,
          notes: delivery.notes,
        },
      });

      const orderId = res?.data?.orderId;
      const orderNumber = res?.data?.orderNumber;

      if (!orderId) throw new Error("No orderId returned from server");

      localStorage.setItem("last_order_id", orderId);
      if (orderNumber) localStorage.setItem("last_order_number", orderNumber);

      if (typeof clearCart === "function") clearCart();

      closeModal();
      navigate(`/purchase-success?orderId=${orderId}`);
    } catch (error) {
      console.error("EFT checkout failed:", error);

      const msg =
        error?.response?.status === 401
          ? "Checkout is currently requiring login."
          : "Could not place the order. Please try again.";

      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <motion.div
        className="space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-sm sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xl font-semibold text-emerald-400">Order summary</p>

        <div className="space-y-4">
          <div className="space-y-2">
            <dl className="flex items-center justify-between gap-4">
              <dt className="text-base font-normal text-gray-300">Original price</dt>
              <dd className="text-base font-medium text-white">R{formattedSubtotal}</dd>
            </dl>

            {savings > 0 && (
              <dl className="flex items-center justify-between gap-4">
                <dt className="text-base font-normal text-gray-300">Savings</dt>
                <dd className="text-base font-medium text-emerald-400">-R{formattedSavings}</dd>
              </dl>
            )}

            {coupon && isCouponApplied && (
              <dl className="flex items-center justify-between gap-4">
                <dt className="text-base font-normal text-gray-300">Coupon ({coupon.code})</dt>
                <dd className="text-base font-medium text-emerald-400">
                  -{coupon.discountPercentage}%
                </dd>
              </dl>
            )}

            <dl className="flex items-center justify-between gap-4 border-t border-gray-600 pt-2">
              <dt className="text-base font-bold text-white">Total</dt>
              <dd className="text-base font-bold text-emerald-400">R{formattedTotal}</dd>
            </dl>
          </div>

          <button
            type="button"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-5 py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed"
            disabled
            title="Card payments will be available soon"
          >
            Card Payment (Coming Soon)
          </button>

          <motion.button
            className="flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300 disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openModal}
            disabled={cart.length === 0}
          >
            Checkout with EFT (Bank Transfer)
          </motion.button>

          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-normal text-gray-400">or</span>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 underline hover:text-emerald-300 hover:no-underline"
            >
              Continue Shopping
              <MoveRight size={16} />
            </Link>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />

            <motion.div
              className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl max-h-[90vh] overflow-y-auto"
              initial={{ y: 30, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between border-b border-gray-800 p-5">
                <div>
                  <p className="text-lg font-semibold text-emerald-400">Delivery details</p>
                  <p className="text-sm text-gray-400">We’ll use this to process your EFT order.</p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-300">Full name *</label>
                  <input
                    value={delivery.fullName}
                    onChange={(e) => setDelivery((d) => ({ ...d, fullName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white outline-none focus:border-emerald-500"
                    placeholder="e.g. Thando Mthembu"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-gray-300">Phone / WhatsApp number *</label>
                  <input
                    value={delivery.phone}
                    onChange={(e) => setDelivery((d) => ({ ...d, phone: e.target.value }))}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white outline-none focus:border-emerald-500"
                    placeholder="e.g. +27 71 000 0000"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-gray-300">Address (Street / Area) *</label>
                  <input
                    value={delivery.addressLine}
                    onChange={(e) => setDelivery((d) => ({ ...d, addressLine: e.target.value }))}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white outline-none focus:border-emerald-500"
                    placeholder="e.g. 17 Malcolm Road, Umlazi"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-gray-300">City *</label>
                  <input
                    value={delivery.city}
                    onChange={(e) => setDelivery((d) => ({ ...d, city: e.target.value }))}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white outline-none focus:border-emerald-500"
                    placeholder="e.g. Durban"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm text-gray-300">Province (optional)</label>
                    <input
                      value={delivery.province}
                      onChange={(e) => setDelivery((d) => ({ ...d, province: e.target.value }))}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white outline-none focus:border-emerald-500"
                      placeholder="e.g. KwaZulu-Natal"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-gray-300">Postal code (optional)</label>
                    <input
                      value={delivery.postalCode}
                      onChange={(e) => setDelivery((d) => ({ ...d, postalCode: e.target.value }))}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white outline-none focus:border-emerald-500"
                      placeholder="e.g. 4001"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-gray-300">Order notes (optional)</label>
                  <textarea
                    value={delivery.notes}
                    onChange={(e) => setDelivery((d) => ({ ...d, notes: e.target.value }))}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white outline-none focus:border-emerald-500"
                    rows={3}
                    placeholder="Any delivery instructions?"
                  /> 
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleEftCheckout}
                    disabled={!canSubmit || isSubmitting}
                    className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Placing order...
                      </>
                    ) : (
                      "Continue (EFT)"
                    )}
                  </button>
                </div>

                {!canSubmit && (
                  <p className="text-xs text-gray-500">Fill in the required fields to continue.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OrderSummary;
