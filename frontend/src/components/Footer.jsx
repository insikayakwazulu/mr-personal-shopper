import { Link } from "react-router-dom";

const Footer = () => {
	return (
		<footer className='border-t border-gray-800 bg-gray-900 mt-16'>
			<div className='max-w-7xl mx-auto px-4 py-10'>
				<div className='grid grid-cols-1 md:grid-cols-3 gap-10'>
					{/* Brand */}
					<div>
						<h2 className='text-2xl font-bold text-emerald-400'>
							MR Personal Shopper
						</h2>

						<p className='mt-3 text-sm text-gray-400 leading-6'>
							Premium fashion, lifestyle and tech products delivered with
							convenience and style.
						</p>
					</div>

					{/* Navigation */}
					<div>
						<h3 className='text-white font-semibold mb-4'>Quick Links</h3>

						<div className='flex flex-col gap-2 text-sm'>
							<Link to='/' className='text-gray-400 hover:text-emerald-400 transition'>
								Home
							</Link>

							<Link
								to='/category/phones'
								className='text-gray-400 hover:text-emerald-400 transition'
							>
								Phones
							</Link>

							<Link
								to='/cart'
								className='text-gray-400 hover:text-emerald-400 transition'
							>
								Cart
							</Link>
						</div>
					</div>

					{/* Legal */}
					<div>
						<h3 className='text-white font-semibold mb-4'>Legal</h3>

						<div className='flex flex-col gap-2 text-sm'>
							<Link
								to='/terms-and-conditions'
								className='text-gray-400 hover:text-emerald-400 transition'
							>
								Terms & Conditions
							</Link>

							<Link
								to='/privacy-policy'
								className='text-gray-400 hover:text-emerald-400 transition'
							>
								Privacy Policy
							</Link>
						</div>
					</div>
				</div>

				<div className='border-t border-gray-800 mt-10 pt-6 text-center text-sm text-gray-500'>
					© {new Date().getFullYear()} MR Personal Shopper. All rights reserved.
				</div>
			</div>
		</footer>
	);
};

export default Footer;