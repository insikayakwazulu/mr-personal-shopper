const TermsAndConditionsPage = () => {
	return (
		<div className='max-w-4xl mx-auto px-4 py-16 text-gray-300'>
			<h1 className='text-4xl font-bold text-emerald-400 mb-8'>
				Terms & Conditions
			</h1>

			<div className='space-y-6 leading-7'>
				<p>
					By using MR Personal Shopper, you agree to comply with and be bound
					by these Terms and Conditions.
				</p>

				<div>
					<h2 className='text-2xl font-semibold text-white mb-2'>
						Products & Orders
					</h2>

					<p>
						All products displayed on this website are subject to availability.
						We reserve the right to cancel or refuse any order at our
						discretion.
					</p>
				</div>

				<div>
					<h2 className='text-2xl font-semibold text-white mb-2'>
						Payments
					</h2>

					<p>
						Orders using EFT payment methods will only be processed after proof
						of payment has been received and verified.
					</p>
				</div>

				<div>
					<h2 className='text-2xl font-semibold text-white mb-2'>
						Delivery
					</h2>

					<p>
						Delivery times may vary depending on product availability and
						location. Customers are responsible for providing accurate delivery
						information.
					</p>
				</div>

				<div>
					<h2 className='text-2xl font-semibold text-white mb-2'>
						Returns & Refunds
					</h2>

					<p>
						Returns and refunds are subject to approval and product condition.
						Certain products may not qualify for return due to hygiene or usage
						conditions.
					</p>
				</div>

				<div>
					<h2 className='text-2xl font-semibold text-white mb-2'>
						Limitation of Liability
					</h2>

					<p>
						MR Personal Shopper shall not be held liable for indirect,
						incidental, or consequential damages arising from use of the
						platform or purchased products.
					</p>
				</div>
			</div>
		</div>
	);
};

export default TermsAndConditionsPage;