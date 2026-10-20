import { getApiBase } from "./base";
import type { Order } from "./order";

interface Receipt {
	id: number;
	token: string;
	expiresAt: string;
}

const prefix = "order_receipt_v1:";
// Keep the current page usable when browser storage is unavailable.
const temporaryReceipts = new Map<string, Receipt>();
// Completed orders are immutable, so avoid polling them again on this page.
const cachedOrders = new Map<string, Order>();
const keyFor = (id: number) => `${prefix}${getApiBase()}:${id}`;

function valid(value: unknown): value is Receipt {
	if (!value || typeof value !== "object") return false;
	const entry = value as Partial<Receipt>;
	return (
		Number.isSafeInteger(entry.id) &&
		(entry.id ?? 0) > 0 &&
		typeof entry.token === "string" &&
		/^[A-Za-z0-9_-]{43}$/.test(entry.token) &&
		typeof entry.expiresAt === "string" &&
		new Date(entry.expiresAt).getTime() > Date.now()
	);
}

function remove(key: string) {
	temporaryReceipts.delete(key);
	cachedOrders.delete(key);
	try {
		localStorage.removeItem(key);
	} catch {
		/* Storage may be disabled. */
	}
}

export function saveReceipt(
	order: Order & {
		receipt_token: string;
		receipt_expires_at: string;
	},
): boolean {
	const receipt = {
		id: order.id,
		token: order.receipt_token,
		expiresAt: order.receipt_expires_at,
	};
	if (!valid(receipt)) return false;
	const key = keyFor(receipt.id);
	cachedOrders.delete(key);
	try {
		localStorage.setItem(key, JSON.stringify(receipt));
		return true;
	} catch {
		temporaryReceipts.set(key, receipt);
		return false;
	}
}

export async function getCustomerOrders(): Promise<Order[]> {
	const entries = new Map<string, unknown>(temporaryReceipts);
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (!key?.startsWith(`${prefix}${getApiBase()}:`)) continue;
			try {
				entries.set(key, JSON.parse(localStorage.getItem(key) ?? "null"));
			} catch {
				entries.set(key, null);
			}
		}
	} catch {
		/* Use this page's temporary receipts. */
	}
	const receipts: Receipt[] = [];
	for (const [key, entry] of entries) {
		if (!valid(entry) || key !== keyFor(entry.id)) {
			remove(key);
			continue;
		}
		receipts.push(entry);
	}
	const results = await Promise.allSettled(
		receipts.map(async (receipt) => {
			const key = keyFor(receipt.id);
			const cached = cachedOrders.get(key);
			if (cached?.status === "completed") return cached;
			try {
				const response = await fetch(
					`${getApiBase()}/orders/${receipt.id}/receipt`,
					{
						headers: { "X-Order-Receipt": receipt.token },
						cache: "no-store",
					},
				);
				if (response.status === 410) {
					remove(key);
					return null;
				}
				if (!response.ok)
					throw new Error(
						"注文履歴の取得に失敗しました。更新して再試行してください",
					);
				const order = (await response.json()) as Order;
				cachedOrders.set(key, order);
				return order;
			} catch (error) {
				if (cached) return cached;
				throw error;
			}
		}),
	);
	const orders = results.flatMap((result) =>
		result.status === "fulfilled" && result.value ? [result.value] : [],
	);
	if (orders.length === 0) {
		const failure = results.find((result) => result.status === "rejected");
		if (failure?.status === "rejected") throw failure.reason;
	}
	return orders.sort((a, b) => b.id - a.id);
}
