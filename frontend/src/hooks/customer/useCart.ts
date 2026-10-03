import { useState } from "react";
import { type Cart, changeCartQuantity, type Menu } from "../../cart";
import type { ShowToast } from "../useToast";
export function useCart(showToast: ShowToast) {
	const [cart, setCart] = useState<Cart>({});
	const [isCartOpen, setIsCartOpen] = useState(false);
	// Add to Cart
	const addToCart = (menu: Menu) => {
		if (!menu.is_available) {
			showToast("このメニューは現在売り切れです", "error");
			return;
		}
		setCart((prev) => {
			const current = prev[menu.id];
			return {
				...prev,
				[menu.id]: {
					menu,
					quantity: current ? current.quantity + 1 : 1,
				},
			};
		});
		showToast(`${menu.name} をカートに追加しました`);
	};

	// Update Cart Quantity
	const updateCartQty = (menuId: number, delta: number) => {
		setCart((prev) => changeCartQuantity(prev, menuId, delta));
	};

	// Remove from Cart
	const removeFromCart = (menuId: number) => {
		setCart((prev) => {
			const copy = { ...prev };
			delete copy[menuId];
			return copy;
		});
	};

	return {
		cart,
		setCart,
		isCartOpen,
		setIsCartOpen,
		addToCart,
		updateCartQty,
		removeFromCart,
	};
}
