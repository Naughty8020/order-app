import { useState } from "react";
import {
	type Cart,
	changeCartQuantity,
	getCartItemKey,
	type Menu,
} from "../../cart";
import type { ShowToast } from "../useToast";
export function useCart(showToast: ShowToast) {
	const [cart, setCart] = useState<Cart>({});
	const [isCartOpen, setIsCartOpen] = useState(false);
	// Add to Cart
	const addToCart = (menu: Menu, option?: string) => {
		if (!menu.is_available) {
			showToast("このメニューは現在売り切れです", "error");
			return;
		}
		const key = getCartItemKey(menu.id, option);
		setCart((prev) => {
			const current = prev[key];
			return {
				...prev,
				[key]: {
					key,
					menu,
					option,
					quantity: current ? current.quantity + 1 : 1,
				},
			};
		});
		showToast(`${menu.name} をカートに追加しました`);
	};

	// Update Cart Quantity
	const updateCartQty = (itemKey: string | number, delta: number) => {
		setCart((prev) => changeCartQuantity(prev, itemKey, delta));
	};

	// Remove from Cart
	const removeFromCart = (itemKey: string | number) => {
		setCart((prev) => {
			const copy = { ...prev };
			delete copy[String(itemKey)];
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
