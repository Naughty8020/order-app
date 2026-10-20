import type { Menu } from "../cart";
import { authenticatedFetch } from "./auth";
import { getApiBase } from "./base";

export type StaffOrderStatus = "ready" | "completed";

export async function updateOrderStatus(
	id: number,
	status: StaffOrderStatus,
): Promise<void> {
	const response = await authenticatedFetch(
		`${getApiBase()}/orders/${id}/status`,
		{
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status }),
		},
		true,
	);
	if (!response.ok) throw new Error("ステータス更新に失敗しました");
}

export interface OrderItem {
	name?: string;
	id: number;
	order_id: number;
	menu_id: number;
	menu: Menu;
	quantity: number;
	price: number;
	option: string;
}

export interface Order {
	id: number;
	status: string;
	created_at: string;
	order_items: OrderItem[];
}

export interface CreateOrderRequest {
	items: { menu_id: number; quantity: number; option?: string }[];
}

export type CreateOrderResult =
	| {
			ok: true;
			order: Order & { receipt_token: string; receipt_expires_at: string };
	  }
	| { ok: false; status: number; error: string };

export async function getOrders(): Promise<Order[]> {
	const response = await authenticatedFetch(`${getApiBase()}/orders`);
	if (!response.ok) throw new Error("注文履歴の取得に失敗しました");
	const data: { orders?: Order[] } = await response.json();
	return data.orders || [];
}

export async function getPublicOrders(): Promise<Order[]> {
	const response = await fetch(`${getApiBase()}/orders/public`, {
		cache: "no-store",
	});
	if (!response.ok) throw new Error("注文状況の取得に失敗しました");
	const data: { orders: { id: number; status: string }[] } =
		await response.json();
	return data.orders.map((order) => ({
		...order,
		created_at: "",
		order_items: [],
	}));
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
		const data: { error?: string } = await response.json().catch(() => ({}));
		return {
			ok: false,
			status: response.status,
			error: data.error || "注文の送信に失敗しました",
		};
	}
	return { ok: true, order: await response.json() };
}
