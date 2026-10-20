import type { Order } from "./order";
import { getApiBase } from "./base";

interface Receipt {
	id: number;
	token: string;
	expiresAt: string;
}

const prefix = "order_receipt_v1:";
// Keep the current page usable when browser storage is unavailable.
const temporaryReceipts = new Map<string, Receipt>();
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
	const orders = await Promise.all(
		receipts.map(async (receipt) => {
			const response = await fetch(
				`${getApiBase()}/orders/${receipt.id}/receipt`,
				{
					headers: { "X-Order-Receipt": receipt.token },
					cache: "no-store",
				},
			);
			if (response.status === 404) {
				remove(keyFor(receipt.id));
				return null;
			}
			if (!response.ok)
				throw new Error(
					"注文履歴の取得に失敗しました。更新して再試行してください",
				);
			return (await response.json()) as Order;
		}),
	);
	return orders
		.filter((order): order is Order => order !== null)
		.sort((a, b) => b.id - a.id);
}
