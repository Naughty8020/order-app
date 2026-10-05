import type { Cart, Menu } from "../../../cart";
import { MenuCard } from "./MenuCard";

interface Props {
	loading: boolean;
	menus: Menu[];
	cart: Cart;
	addToCart: (menu: Menu) => void;
	updateCartQty: (menuId: number, delta: number) => void;
}

export function MenuGrid({
	loading,
	menus,
	cart,
	addToCart,
	updateCartQty,
}: Props) {
	return (
		<>
			{loading && menus.length === 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-5">
					{[1, 2, 3, 4].map((n) => (
						<div
							key={n}
							className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] h-24 md:h-[220px] rounded-2xl animate-pulse"
						/>
					))}
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-5">
					{menus.map((menu, index) => (
						<MenuCard
							key={menu.id}
							menu={menu}
							inCart={cart[menu.id]}
							isFeatured={index === 1}
							addToCart={addToCart}
							updateCartQty={updateCartQty}
						/>
					))}
				</div>
			)}
		</>
	);
}
