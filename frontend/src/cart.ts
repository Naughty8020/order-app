export interface Menu {
	id: number;
	name: string;
	price: number;
	is_available: boolean;
	is_recommended?: boolean;
	is_featured?: boolean;
}

export interface CartItem {
	key?: string;
	menu: Menu;
	quantity: number;
	option?: string;
}

export type Cart = Record<string, CartItem>;

export const getCartItemKey = (menuId: number, option?: string) =>
	option ? `${menuId}:${option}` : String(menuId);

export function changeCartQuantity(
	cart: Cart,
	itemKey: string | number,
	delta: number,
): Cart {
	const key = String(itemKey);
	const current = cart[key];
	if (!current) return cart;

	const quantity = current.quantity + delta;
	if (quantity <= 0) {
		const next = { ...cart };
		delete next[key];
		return next;
	}

	return { ...cart, [key]: { ...current, quantity } };
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
