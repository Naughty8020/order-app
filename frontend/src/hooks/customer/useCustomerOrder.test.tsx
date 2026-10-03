// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCustomerOrder } from "./useCustomerOrder";

const menu = { id: 1, name: "コーラ", price: 200, is_available: true };
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
	window.history.replaceState({}, "", "/");
	window.sessionStorage.clear();
	vi.stubGlobal("fetch", fetchMock);
	fetchMock.mockImplementation(async (input, init) => {
		const url = String(input);
		if (url.endsWith("/menus")) return Response.json({ data: [menu] });
		if (url.endsWith("/orders") && init?.method === "POST") {
			return Response.json({ id: 42 });
		}
		if (url.endsWith("/orders")) return Response.json({ orders: [] });
		throw new Error(`Unexpected request: ${url}`);
	});
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

function saveSession(expiresAt: string) {
	window.sessionStorage.setItem(
		"order_session",
		JSON.stringify({ token: "session-token", expiresAt }),
	);
}

describe("customer ordering", () => {
	it("exchanges a QR token and stores the session while preserving other query parameters", async () => {
		window.history.replaceState({}, "", "/?order_token=qr-token&source=store");
		const expiresAt = new Date(Date.now() + 60_000).toISOString();
		fetchMock.mockResolvedValueOnce(
			Response.json({ session_token: "new-session", expires_at: expiresAt }),
		);
		const { result } = renderHook(() => useCustomerOrder());
		await waitFor(() => expect(result.current.orderAccessStatus).toBe("valid"));
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringMatching(/\/order-access\/session$/),
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token: "qr-token" }),
			},
		);
		expect(
			JSON.parse(window.sessionStorage.getItem("order_session") || "null"),
		).toEqual({
			token: "new-session",
			expiresAt,
		});
		expect(window.location.search).toBe("?source=store");
	});

	it("rejects an invalid QR token without storing a session", async () => {
		window.history.replaceState({}, "", "/?order_token=invalid");
		fetchMock.mockResolvedValueOnce(
			Response.json({ error: "invalid or expired QR token" }, { status: 401 }),
		);
		const { result } = renderHook(() => useCustomerOrder());
		await waitFor(() =>
			expect(result.current.orderAccessStatus).toBe("invalid"),
		);
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(window.sessionStorage.getItem("order_session")).toBeNull();
	});

	it("restores a session and submits quantities with the session token", async () => {
		saveSession(new Date(Date.now() + 60_000).toISOString());
		const { result } = renderHook(() => useCustomerOrder());
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.menus).toEqual([menu]);
		expect(result.current.orderAccessStatus).toBe("valid");
		act(() => result.current.addToCart(menu));
		act(() => result.current.updateCartQty(menu.id, 1));
		await act(() => result.current.submitOrder());
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringMatching(/\/orders$/),
			expect.objectContaining({
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Order-Session": "session-token",
				},
				body: JSON.stringify({ items: [{ menu_id: 1, quantity: 2 }] }),
			}),
		);
		expect(result.current.cart).toEqual({});
		expect(result.current.successModal).toEqual({ show: true, orderId: 42 });
	});

	it("keeps the cart and rejects ordering with an expired session", async () => {
		saveSession(new Date(Date.now() - 1_000).toISOString());
		const { result } = renderHook(() => useCustomerOrder());
		await waitFor(() => expect(result.current.loading).toBe(false));
		act(() => result.current.addToCart(menu));
		await act(() => result.current.submitOrder());
		expect(result.current.orderAccessStatus).toBe("invalid");
		expect(result.current.cart[1].quantity).toBe(1);
		expect(window.sessionStorage.getItem("order_session")).toBeNull();
		expect(
			fetchMock.mock.calls.some(([, init]) => init?.method === "POST"),
		).toBe(false);
	});

	it("clears rejected authorization but retains the cart on a 401", async () => {
		saveSession(new Date(Date.now() + 60_000).toISOString());
		const { result } = renderHook(() => useCustomerOrder());
		await waitFor(() => expect(result.current.loading).toBe(false));
		act(() => result.current.addToCart(menu));
		fetchMock.mockResolvedValueOnce(
			Response.json({ error: "期限切れ" }, { status: 401 }),
		);
		await act(() => result.current.submitOrder());
		expect(result.current.orderAccessStatus).toBe("invalid");
		expect(result.current.cart[1].quantity).toBe(1);
		expect(result.current.toast).toEqual({
			message: "期限切れ",
			type: "error",
		});
		expect(window.sessionStorage.getItem("order_session")).toBeNull();
	});
});
