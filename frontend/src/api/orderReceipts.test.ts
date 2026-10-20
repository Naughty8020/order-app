// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getApiBase } from "./base";
import type { Order } from "./order";
import { getCustomerOrders, saveReceipt } from "./orderReceipts";

const order: Order = {
	id: 7,
	status: "completed",
	created_at: "2026-10-20T00:00:00Z",
	order_items: [
		{
			id: 1,
			order_id: 7,
			menu_id: 1,
			name: "お茶",
			menu: { id: 1, name: "お茶", price: 200, is_available: true },
			price: 200,
			quantity: 2,
		},
	],
};
const key = `order_receipt_v1:${getApiBase()}:7`;
const token = "a".repeat(43);
function save() {
	return saveReceipt({
		...order,
		receipt_token: token,
		receipt_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
	});
}
beforeEach(() => localStorage.clear());
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	localStorage.clear();
});

it("restores completed orders using the saved key without an order session", async () => {
	expect(save()).toBe(true);
	const fetchMock = vi.fn(async () => Response.json(order));
	vi.stubGlobal("fetch", fetchMock);
	expect(await getCustomerOrders()).toEqual([order]);
	expect(fetchMock).toHaveBeenCalledWith(`${getApiBase()}/orders/7/receipt`, {
		headers: { "X-Order-Receipt": token },
		cache: "no-store",
	});
	expect(localStorage.getItem(key)).not.toContain("お茶");
});

it("does not fetch other customers' orders or the staff listing when no key exists", async () => {
	const fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);
	expect(await getCustomerOrders()).toEqual([]);
	expect(fetchMock).not.toHaveBeenCalled();
});

it("discards malformed and expired receipts", async () => {
	localStorage.setItem(key, "{broken");
	localStorage.setItem(
		`order_receipt_v1:${getApiBase()}:8`,
		JSON.stringify({ id: 8, token, expiresAt: new Date(0).toISOString() }),
	);
	const fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);
	expect(await getCustomerOrders()).toEqual([]);
	expect(fetchMock).not.toHaveBeenCalled();
	expect(localStorage.length).toBe(0);
});

it("keeps keys on transient failures and removes explicitly expired keys", async () => {
	save();
	const fetchMock = vi
		.fn()
		.mockRejectedValueOnce(new Error("offline"))
		.mockResolvedValueOnce(new Response(null, { status: 500 }))
		.mockResolvedValueOnce(new Response(null, { status: 404 }))
		.mockResolvedValueOnce(new Response(null, { status: 410 }));
	vi.stubGlobal("fetch", fetchMock);
	await expect(getCustomerOrders()).rejects.toThrow("offline");
	expect(localStorage.getItem(key)).not.toBeNull();
	await expect(getCustomerOrders()).rejects.toThrow("注文履歴");
	expect(localStorage.getItem(key)).not.toBeNull();
	await expect(getCustomerOrders()).rejects.toThrow("注文履歴");
	expect(localStorage.getItem(key)).not.toBeNull();
	expect(await getCustomerOrders()).toEqual([]);
	expect(localStorage.getItem(key)).toBeNull();
});

it("keeps successful and cached orders when another receipt temporarily fails", async () => {
	save();
	const secondOrder = { ...order, id: 8 };
	saveReceipt({
		...secondOrder,
		receipt_token: "b".repeat(43),
		receipt_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
	});
	let secondFails = true;
	const fetchMock = vi.fn(async (input: string | URL | Request) => {
		const url = String(input);
		if (url.endsWith("/orders/7/receipt")) return Response.json(order);
		if (secondFails) throw new Error("temporary failure");
		return Response.json(secondOrder);
	});
	vi.stubGlobal("fetch", fetchMock);

	expect(await getCustomerOrders()).toEqual([order]);
	secondFails = false;
	expect(await getCustomerOrders()).toEqual([secondOrder, order]);
	expect(
		fetchMock.mock.calls.filter(([input]) =>
			String(input).endsWith("/orders/7/receipt"),
		),
	).toHaveLength(1);
	expect(
		fetchMock.mock.calls.filter(([input]) =>
			String(input).endsWith("/orders/8/receipt"),
		),
	).toHaveLength(2);
});

it("does not poll a completed order again on the same page", async () => {
	save();
	const fetchMock = vi.fn(async () => Response.json(order));
	vi.stubGlobal("fetch", fetchMock);
	expect(await getCustomerOrders()).toEqual([order]);
	expect(await getCustomerOrders()).toEqual([order]);
	expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("retains the current receipt in memory if storage is full", async () => {
	vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
		throw new Error("quota");
	});
	expect(save()).toBe(false);
	const pendingOrder = { ...order, status: "pending" };
	const fetchMock = vi
		.fn()
		.mockResolvedValueOnce(Response.json(pendingOrder))
		.mockResolvedValueOnce(new Response(null, { status: 410 }));
	vi.stubGlobal("fetch", fetchMock);
	expect(await getCustomerOrders()).toEqual([pendingOrder]);
	await getCustomerOrders(); // Drop the temporary key as well.
});
