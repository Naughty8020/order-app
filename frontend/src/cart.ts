export interface Menu {
	id: number;
	name: string;
	price: number;
	is_available: boolean;
	is_recommended?: boolean;
	is_featured?: boolean;
}

export interface CartItem {
	menu: Menu;
	quantity: number;
}

export type Cart = Record<number, CartItem>;

export function changeCartQuantity(
	cart: Cart,
	menuId: number,
	delta: number,
): Cart {
	const current = cart[menuId];
	if (!current) return cart;

	const quantity = current.quantity + delta;
	if (quantity <= 0) {
		const next = { ...cart };
		delete next[menuId];
		return next;
	}

	return { ...cart, [menuId]: { ...current, quantity } };
}

export function getCartSummary(cart: Cart) {
	return Object.values(cart).reduce(
		(summary, item) => ({
			count: summary.count + item.quantity,
			total: summary.total + item.menu.price * item.quantity,
		}),
		{ count: 0, total: 0 },
	);
}
