import { useState } from "react";
import { ShoppingCart, UserPlus, LogIn, LogOut, Lock, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";

const Navbar = () => {
	const { user, logout } = useUserStore();
	const { cart } = useCartStore();
	const [isOpen, setIsOpen] = useState(false);

	const isAdmin = user?.role === "admin";

	const closeMenu = () => setIsOpen(false);

	return (
		<header className='fixed top-0 left-0 w-full bg-gray-900/95 backdrop-blur-md shadow-lg z-40 border-b border-emerald-800'>
			<div className='container mx-auto px-4 py-3'>
				<div className='flex items-center justify-between'>
					<Link
						to='/'
						onClick={closeMenu}
						className='text-xl sm:text-2xl font-bold text-emerald-400 whitespace-nowrap'
					>
						Mr Personal Shopper
					</Link>

					<button
						type='button'
						onClick={() => setIsOpen((v) => !v)}
						className='md:hidden rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-200 hover:bg-gray-700'
						aria-label='Toggle menu'
					>
						{isOpen ? <X size={22} /> : <Menu size={22} />}
					</button>

					<nav className='hidden md:flex items-center gap-4'>
						<NavLinks
							user={user}
							isAdmin={isAdmin}
							cart={cart}
							logout={logout}
							closeMenu={closeMenu}
						/>
					</nav>
				</div>

				{isOpen && (
					<nav className='md:hidden mt-4 rounded-xl border border-gray-800 bg-gray-950 p-3 shadow-xl'>
						<div className='flex flex-col gap-2'>
							<NavLinks
								user={user}
								isAdmin={isAdmin}
								cart={cart}
								logout={logout}
								closeMenu={closeMenu}
								mobile
							/>
						</div>
					</nav>
				)}
			</div>
		</header>
	);
};

const NavLinks = ({ user, isAdmin, cart, logout, closeMenu, mobile = false }) => {
	const baseLink =
		"rounded-lg px-3 py-2 text-gray-300 hover:bg-gray-800 hover:text-emerald-400 transition";
	const buttonBase =
		"rounded-lg px-4 py-2 font-medium transition flex items-center justify-center gap-2";

	return (
		<>
			<Link to='/' onClick={closeMenu} className={baseLink}>
				Home
			</Link>

			{user && (
				<Link
					to='/cart'
					onClick={closeMenu}
					className={`${baseLink} relative flex items-center gap-2 ${mobile ? "justify-start" : ""}`}
				>
					<ShoppingCart size={20} />
					<span>Cart</span>
					{cart.length > 0 && (
						<span className='ml-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs text-white'>
							{cart.length}
						</span>
					)}
				</Link>
			)}

			{isAdmin && (
				<Link
					to='/secret-dashboard'
					onClick={closeMenu}
					className={`${buttonBase} bg-emerald-700 text-white hover:bg-emerald-600`}
				>
					<Lock size={18} />
					Dashboard
				</Link>
			)}

			{user ? (
				<button
					type='button'
					onClick={() => {
						logout();
						closeMenu();
					}}
					className={`${buttonBase} bg-gray-700 text-white hover:bg-gray-600`}
				>
					<LogOut size={18} />
					Log Out
				</button>
			) : (
				<>
					<Link
						to='/signup'
						onClick={closeMenu}
						className={`${buttonBase} bg-emerald-600 text-white hover:bg-emerald-700`}
					>
						<UserPlus size={18} />
						Sign Up
					</Link>

					<Link
						to='/login'
						onClick={closeMenu}
						className={`${buttonBase} bg-gray-700 text-white hover:bg-gray-600`}
					>
						<LogIn size={18} />
						Login
					</Link>
				</>
			)}
		</>
	);
};

export default Navbar;