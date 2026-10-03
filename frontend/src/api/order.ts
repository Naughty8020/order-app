import type { Menu } from "../cart";
import { getApiBase } from "./base";

export interface OrderItem {
	id: number;
	order_id: number;
	menu_id: number;
	menu: Menu;
	quantity: number;
	price: number;
}

export interface Order {
	id: number;
	status: string;
	created_at: string;
	order_items: OrderItem[];
}

export interface CreateOrderRequest {
	items: { menu_id: number; quantity: number }[];
}

export type CreateOrderResult =
	| { ok: true; order: { id?: number } }
	| { ok: false; status: number; error: string };

export async function getOrders(): Promise<Order[]> {
	const response = await fetch(`${getApiBase()}/orders`);
	if (!response.ok) throw new Error("注文履歴の取得に失敗しました");
	const data: { orders?: Order[] } = await response.json();
	return data.orders || [];
}

export async function createOrder(
	payload: CreateOrderRequest,
	sessionToken: string,
): Promise<CreateOrderResult> {
	const response = await fetch(`${getApiBase()}/orders`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Order-Session": sessionToken,
		},
		body: JSON.stringify(payload),
	});
	if (!response.ok) {
		const data: { error?: string } = await response.json();
		return {
			ok: false,
			status: response.status,
			error: data.error || "注文の送信に失敗しました",
		};
	}
	return { ok: true, order: await response.json() };
}
